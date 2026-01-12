const fs = require('fs').promises;
const express = require('express');
const { EnvVar } = require('@librechat/agents');
const { logger } = require('@librechat/data-schemas');
const { createMulterInstance } = require('./multer');
const {
  Time,
  isUUID,
  CacheKeys,
  FileSources,
  SystemRoles,
  ResourceType,
  EModelEndpoint,
  PermissionBits,
  checkOpenAIStorage,
  isAssistantsEndpoint,
} = require('librechat-data-provider');
const {
  filterFile,
  processFileUpload,
  processDeleteRequest,
  processAgentFileUpload,
} = require('~/server/services/Files/process');
const { fileAccess } = require('~/server/middleware/accessResources/fileAccess');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const { getOpenAIClient } = require('~/server/controllers/assistants/helpers');
const { checkPermission } = require('~/server/services/PermissionService');
const { loadAuthValues } = require('~/server/services/Tools/credentials');
const { refreshS3FileUrls } = require('~/server/services/Files/S3/crud');
const { hasAccessToFilesViaAgent } = require('~/server/services/Files');
const { getFiles, batchUpdateFiles } = require('~/models');
const { cleanFileName } = require('~/server/utils/files');
const { getAssistant } = require('~/models/Assistant');
const { getAgent } = require('~/models/Agent');
const { getLogStores } = require('~/cache');
const { Readable } = require('stream');
const { STTService } = require('~/server/services/Files/Audio/STTService');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// Initialize multer for direct-transcribe (lazy initialization)
let directTranscribeMulter = null;
const getDirectTranscribeMulter = async () => {
  if (!directTranscribeMulter) {
    directTranscribeMulter = await createMulterInstance();
  }
  return directTranscribeMulter;
};

// Initialize multer for main POST route (lazy initialization)
let mainUploadMulter = null;
const getMainUploadMulter = async () => {
  if (!mainUploadMulter) {
    mainUploadMulter = await createMulterInstance();
  }
  return mainUploadMulter;
};

router.get('/', async (req, res) => {
  try {
    const appConfig = req.config;
    const files = await getFiles({ user: req.user.id });
    if (appConfig.fileStrategy === FileSources.s3) {
      try {
        const cache = getLogStores(CacheKeys.S3_EXPIRY_INTERVAL);
        const alreadyChecked = await cache.get(req.user.id);
        if (!alreadyChecked) {
          await refreshS3FileUrls(files, batchUpdateFiles);
          await cache.set(req.user.id, true, Time.THIRTY_MINUTES);
        }
      } catch (error) {
        logger.warn('[/files] Error refreshing S3 file URLs:', error);
      }
    }
    res.status(200).send(files);
  } catch (error) {
    logger.error('[/files] Error getting files:', error);
    res.status(400).json({ message: 'Error in request', error: error.message });
  }
});

/**
 * Get files specific to an agent
 * @route GET /files/agent/:agent_id
 * @param {string} agent_id - The agent ID to get files for
 * @returns {Promise<TFile[]>} Array of files attached to the agent
 */
router.get('/agent/:agent_id', async (req, res) => {
  try {
    const { agent_id } = req.params;
    const userId = req.user.id;

    if (!agent_id) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    const agent = await getAgent({ id: agent_id });
    if (!agent) {
      return res.status(200).json([]);
    }

    if (agent.author.toString() !== userId) {
      const hasEditPermission = await checkPermission({
        userId,
        role: req.user.role,
        resourceType: ResourceType.AGENT,
        resourceId: agent._id,
        requiredPermission: PermissionBits.EDIT,
      });

      if (!hasEditPermission) {
        return res.status(200).json([]);
      }
    }

    const agentFileIds = [];
    if (agent.tool_resources) {
      for (const [, resource] of Object.entries(agent.tool_resources)) {
        if (resource?.file_ids && Array.isArray(resource.file_ids)) {
          agentFileIds.push(...resource.file_ids);
        }
      }
    }

    if (agentFileIds.length === 0) {
      return res.status(200).json([]);
    }

    const files = await getFiles({ file_id: { $in: agentFileIds } }, null, { text: 0 });

    res.status(200).json(files);
  } catch (error) {
    logger.error('[/files/agent/:agent_id] Error fetching agent files:', error);
    res.status(500).json({ error: 'Failed to fetch agent files' });
  }
});

router.get('/config', async (req, res) => {
  try {
    const appConfig = req.config;
    res.status(200).json(appConfig.fileConfig);
  } catch (error) {
    logger.error('[/files] Error getting fileConfig', error);
    res.status(400).json({ message: 'Error in request', error: error.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { files: _files } = req.body;

    /** @type {MongoFile[]} */
    const files = _files.filter((file) => {
      if (!file.file_id) {
        return false;
      }
      if (!file.filepath) {
        return false;
      }

      if (/^(file|assistant)-/.test(file.file_id)) {
        return true;
      }

      return isUUID.safeParse(file.file_id).success;
    });

    if (files.length === 0) {
      res.status(204).json({ message: 'Nothing provided to delete' });
      return;
    }

    const fileIds = files.map((file) => file.file_id);
    const dbFiles = await getFiles({ file_id: { $in: fileIds } });

    const ownedFiles = [];
    const nonOwnedFiles = [];

    for (const file of dbFiles) {
      if (file.user.toString() === req.user.id.toString()) {
        ownedFiles.push(file);
      } else {
        nonOwnedFiles.push(file);
      }
    }

    if (nonOwnedFiles.length === 0) {
      await processDeleteRequest({ req, files: ownedFiles });
      logger.debug(
        `[/files] Files deleted successfully: ${ownedFiles
          .filter((f) => f.file_id)
          .map((f) => f.file_id)
          .join(', ')}`,
      );
      res.status(200).json({ message: 'Files deleted successfully' });
      return;
    }

    let authorizedFiles = [...ownedFiles];
    let unauthorizedFiles = [];

    if (req.body.agent_id && nonOwnedFiles.length > 0) {
      const nonOwnedFileIds = nonOwnedFiles.map((f) => f.file_id);
      const accessMap = await hasAccessToFilesViaAgent({
        userId: req.user.id,
        role: req.user.role,
        fileIds: nonOwnedFileIds,
        agentId: req.body.agent_id,
        isDelete: true,
      });

      for (const file of nonOwnedFiles) {
        if (accessMap.get(file.file_id)) {
          authorizedFiles.push(file);
        } else {
          unauthorizedFiles.push(file);
        }
      }
    } else {
      unauthorizedFiles = nonOwnedFiles;
    }

    if (unauthorizedFiles.length > 0) {
      return res.status(403).json({
        message: 'You can only delete files you have access to',
        unauthorizedFiles: unauthorizedFiles.map((f) => f.file_id),
      });
    }

    /* Handle agent unlinking even if no valid files to delete */
    if (req.body.agent_id && req.body.tool_resource && dbFiles.length === 0) {
      const agent = await getAgent({
        id: req.body.agent_id,
      });

      const toolResourceFiles = agent.tool_resources?.[req.body.tool_resource]?.file_ids ?? [];
      const agentFiles = files.filter((f) => toolResourceFiles.includes(f.file_id));

      await processDeleteRequest({ req, files: agentFiles });
      res.status(200).json({ message: 'File associations removed successfully from agent' });
      return;
    }

    /* Handle assistant unlinking even if no valid files to delete */
    if (req.body.assistant_id && req.body.tool_resource && dbFiles.length === 0) {
      const assistant = await getAssistant({
        id: req.body.assistant_id,
      });

      const toolResourceFiles = assistant.tool_resources?.[req.body.tool_resource]?.file_ids ?? [];
      const assistantFiles = files.filter((f) => toolResourceFiles.includes(f.file_id));

      await processDeleteRequest({ req, files: assistantFiles });
      res.status(200).json({ message: 'File associations removed successfully from assistant' });
      return;
    } else if (
      req.body.assistant_id &&
      req.body.files?.[0]?.filepath === EModelEndpoint.azureAssistants
    ) {
      await processDeleteRequest({ req, files: req.body.files });
      return res
        .status(200)
        .json({ message: 'File associations removed successfully from Azure Assistant' });
    }

    await processDeleteRequest({ req, files: authorizedFiles });

    logger.debug(
      `[/files] Files deleted successfully: ${authorizedFiles
        .filter((f) => f.file_id)
        .map((f) => f.file_id)
        .join(', ')}`,
    );
    res.status(200).json({ message: 'Files deleted successfully' });
  } catch (error) {
    logger.error('[/files] Error deleting files:', error);
    res.status(400).json({ message: 'Error in request', error: error.message });
  }
});

function isValidID(str) {
  return /^[A-Za-z0-9_-]{21}$/.test(str);
}

router.get('/code/download/:session_id/:fileId', async (req, res) => {
  try {
    const { session_id, fileId } = req.params;
    const logPrefix = `Session ID: ${session_id} | File ID: ${fileId} | Code output download requested by user `;
    logger.debug(logPrefix);

    if (!session_id || !fileId) {
      return res.status(400).send('Bad request');
    }

    if (!isValidID(session_id) || !isValidID(fileId)) {
      logger.debug(`${logPrefix} invalid session_id or fileId`);
      return res.status(400).send('Bad request');
    }

    const { getDownloadStream } = getStrategyFunctions(FileSources.execute_code);
    if (!getDownloadStream) {
      logger.warn(
        `${logPrefix} has no stream method implemented for ${FileSources.execute_code} source`,
      );
      return res.status(501).send('Not Implemented');
    }

    const result = await loadAuthValues({ userId: req.user.id, authFields: [EnvVar.CODE_API_KEY] });

    /** @type {AxiosResponse<ReadableStream> | undefined} */
    const response = await getDownloadStream(
      `${session_id}/${fileId}`,
      result[EnvVar.CODE_API_KEY],
    );
    res.set(response.headers);
    response.data.pipe(res);
  } catch (error) {
    logger.error('Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

router.get('/download/:userId/:file_id', fileAccess, async (req, res) => {
  try {
    const { userId, file_id } = req.params;
    logger.debug(`File download requested by user ${userId}: ${file_id}`);

    // Access already validated by fileAccess middleware
    const file = req.fileAccess.file;

    if (checkOpenAIStorage(file.source) && !file.model) {
      logger.warn(`File download requested by user ${userId} has no associated model: ${file_id}`);
      return res.status(400).send('The model used when creating this file is not available');
    }

    const { getDownloadStream } = getStrategyFunctions(file.source);
    if (!getDownloadStream) {
      logger.warn(
        `File download requested by user ${userId} has no stream method implemented: ${file.source}`,
      );
      return res.status(501).send('Not Implemented');
    }

    const setHeaders = () => {
      const cleanedFilename = cleanFileName(file.filename);
      res.setHeader('Content-Disposition', `attachment; filename="${cleanedFilename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-File-Metadata', JSON.stringify(file));
    };

    if (checkOpenAIStorage(file.source)) {
      req.body = { model: file.model };
      const endpointMap = {
        [FileSources.openai]: EModelEndpoint.assistants,
        [FileSources.azure]: EModelEndpoint.azureAssistants,
      };
      const { openai } = await getOpenAIClient({
        req,
        res,
        overrideEndpoint: endpointMap[file.source],
      });
      logger.debug(`Downloading file ${file_id} from OpenAI`);
      const passThrough = await getDownloadStream(file_id, openai);
      setHeaders();
      logger.debug(`File ${file_id} downloaded from OpenAI`);

      // Handle both Node.js and Web streams
      const stream =
        passThrough.body && typeof passThrough.body.getReader === 'function'
          ? Readable.fromWeb(passThrough.body)
          : passThrough.body;

      stream.pipe(res);
    } else {
      const fileStream = await getDownloadStream(req, file.filepath);

      fileStream.on('error', (streamError) => {
        logger.error('[DOWNLOAD ROUTE] Stream error:', streamError);
      });

      setHeaders();
      fileStream.pipe(res);
    }
  } catch (error) {
    logger.error('[DOWNLOAD ROUTE] Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

// Wrapper middleware to apply multer with lazy initialization
const multerMiddleware = async (req, res, next) => {
  try {
    const upload = await getMainUploadMulter();
    upload.single('file')(req, res, next);
  } catch (error) {
    logger.error('[/files] Error initializing multer:', error);
    return res.status(500).json({ message: 'Error processing file upload' });
  }
};

router.post('/', multerMiddleware, async (req, res) => {
  const metadata = req.body;
  let cleanup = true;

  try {
    filterFile({ req });

    metadata.temp_file_id = metadata.file_id;
    metadata.file_id = req.file_id;

    if (isAssistantsEndpoint(metadata.endpoint)) {
      return await processFileUpload({ req, res, metadata });
    }

    /**
     * Check agent permissions for permanent agent file uploads (not message attachments).
     * Message attachments (message_file=true) are temporary files for a single conversation
     * and should be allowed for users who can chat with the agent.
     * Permanent file uploads to tool_resources require EDIT permission.
     */
    const isMessageAttachment = metadata.message_file === true || metadata.message_file === 'true';
    if (metadata.agent_id && metadata.tool_resource && !isMessageAttachment) {
      const userId = req.user.id;

      /** Admin users bypass permission checks */
      if (req.user.role !== SystemRoles.ADMIN) {
        const agent = await getAgent({ id: metadata.agent_id });

        if (!agent) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Agent not found',
          });
        }

        /** Check if user is the author or has edit permission */
        if (agent.author.toString() !== userId) {
          const hasEditPermission = await checkPermission({
            userId,
            role: req.user.role,
            resourceType: ResourceType.AGENT,
            resourceId: agent._id,
            requiredPermission: PermissionBits.EDIT,
          });

          if (!hasEditPermission) {
            logger.warn(
              `[/files] User ${userId} denied upload to agent ${metadata.agent_id} (insufficient permissions)`,
            );
            return res.status(403).json({
              error: 'Forbidden',
              message: 'Insufficient permissions to upload files to this agent',
            });
          }
        }
      }
    }

    return await processAgentFileUpload({ req, res, metadata });
  } catch (error) {
    let message = 'Error processing file';
    logger.error('[/files] Error processing file:', error);

    if (error.message?.includes('file_ids')) {
      message += ': ' + error.message;
    }

    if (
      error.message?.includes('Invalid file format') ||
      error.message?.includes('No OCR result') ||
      error.message?.includes('exceeds token limit')
    ) {
      message = error.message;
    }

    try {
      await fs.unlink(req.file.path);
      cleanup = false;
    } catch (error) {
      logger.error('[/files] Error deleting file:', error);
    }
    res.status(500).json({ message });
  } finally {
    if (cleanup) {
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        logger.error('[/files] Error deleting file after file processing:', error);
      }
    } else {
      logger.debug('[/files] File processing completed without cleanup');
    }
  }
});

/**
 * Direct transcript endpoint - bypasses RAG/indexing
 * Processes all file types:
 * - Audio/Video: Generates transcript using OpenAI Whisper
 * - Text files: Reads and returns content
 * - Other files: Returns metadata (future: extract content)
 */
router.post('/direct-transcribe', async (req, res, next) => {
  // CRITICAL: Log immediately when route matches - use both console and logger for Docker visibility
  const logData = {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    baseUrl: req.baseUrl,
    hasBody: !!req.body,
    contentType: req.headers['content-type'],
    user: req.user?.id || 'no-user',
    timestamp: new Date().toISOString(),
  };
  
  // Force output to stderr/stdout for Docker logs
  console.error('[DIRECT-TRANSCRIBE] ===== ROUTE MATCHED =====');
  console.error('[DIRECT-TRANSCRIBE] Route matched!', JSON.stringify(logData, null, 2));
  logger.error('[direct-transcribe] Route matched!', logData);
  
  try {
    // Apply multer middleware first
    const multer = await getDirectTranscribeMulter();
    console.error('[DIRECT-TRANSCRIBE] Multer instance obtained');
    logger.error('[direct-transcribe] Multer instance obtained');
    
    multer.single('file')(req, res, async (err) => {
      console.error('[DIRECT-TRANSCRIBE] Multer callback called', { 
        hasError: !!err, 
        errorMessage: err?.message,
        hasFile: !!req.file,
        fileSize: req.file?.size,
      });
      
      if (err) {
        logger.error('[direct-transcribe] Multer error:', {
          message: err.message,
          stack: err.stack,
          code: err.code,
        });
        console.error('[DIRECT-TRANSCRIBE] Multer error details:', err);
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
    
      // Now process the file
      console.error('[DIRECT-TRANSCRIBE] Route handler called', {
        hasFile: !!req.file,
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        url: req.url,
        baseUrl: req.baseUrl,
      });
      logger.error('[direct-transcribe] Route handler called', {
        hasFile: !!req.file,
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        url: req.url,
        baseUrl: req.baseUrl,
      });
      
      let cleanup = true;
      const { file } = req;

      try {
        if (!file) {
          logger.error('[direct-transcribe] No file in request', {
            body: req.body,
            files: req.files,
          });
          console.error('[DIRECT-TRANSCRIBE] ERROR: No file in request');
          return res.status(400).json({ message: 'No file provided' });
        }

        // Determine file type
        const isVideo = file.mimetype.startsWith('video/');
        const isAudio = file.mimetype.startsWith('audio/');
        
        // Check file extension for better detection (some files have incorrect MIME types)
        const fileExt = path.extname(file.originalname).toLowerCase();
        const isText = file.mimetype.startsWith('text/') || 
                       ['application/json', 'application/csv', 'text/csv', 'text/plain'].includes(file.mimetype) ||
                       ['.txt', '.csv', '.json', '.tsv', '.log', '.md', '.markdown'].includes(fileExt);
        
        console.error('[DIRECT-TRANSCRIBE] File type detection:', {
          filename: file.originalname,
          mimetype: file.mimetype,
          extension: fileExt,
          isVideo,
          isAudio,
          isText,
          size: file.size,
        });
        logger.error('[direct-transcribe] File type detection:', {
          filename: file.originalname,
          mimetype: file.mimetype,
          extension: fileExt,
          isVideo,
          isAudio,
          isText,
          size: file.size,
        });

        // Store file on local filesystem
        const appConfig = req.config;
        const uploadsDir = appConfig.paths.uploads || path.join(process.cwd(), 'uploads');
        const directAttachDir = path.join(uploadsDir, 'direct-attach', req.user.id);
        
        // Ensure directory exists
        await fs.mkdir(directAttachDir, { recursive: true });

        // Generate unique filename
        const fileExtension = fileExt || 
                             (isVideo ? '.mp4' : isAudio ? '.mp3' : '.txt');
        const fileId = crypto.randomUUID();
        const storedFilename = `${fileId}${fileExtension}`;
        const storedPath = path.join(directAttachDir, storedFilename);

        // Copy file to storage location
        await fs.copyFile(file.path, storedPath);

        // Handle audio/video files - generate transcript
        if (isVideo || isAudio) {
          console.error('[DIRECT-TRANSCRIBE] Processing audio/video file:', file.originalname);
          logger.error('[direct-transcribe] Processing audio/video file:', file.originalname);
          
          // Check OpenAI API key for audio/video processing
          const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
          if (!OPENAI_API_KEY) {
            console.error('[DIRECT-TRANSCRIBE] ERROR: OpenAI API key not configured');
            logger.error('[direct-transcribe] ERROR: OpenAI API key not configured');
            return res.status(500).json({ 
              message: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
            });
          }

          // For video files, we'll need to extract audio first
          // For now, we'll use the STT service which can handle audio
          // Note: Video files may need ffmpeg to extract audio - this is a simplified version
          let audioPath = file.path;
          let shouldDeleteAudio = false;

          if (isVideo) {
            // For video files, we need to extract audio
            // This requires ffmpeg - for now, we'll return an error suggesting audio extraction
            // In production, you'd use ffmpeg to extract audio track
            console.error('[DIRECT-TRANSCRIBE] Video file received - attempting to process with Whisper');
            logger.error('[direct-transcribe] Video file received - audio extraction needed');
            // For MVP, we'll try to process as-is (OpenAI Whisper can handle some video formats)
            audioPath = file.path;
          }

          // Use STT service to generate transcript
          const sttService = await STTService.getInstance();
          const audioBuffer = await fs.readFile(audioPath);
          const audioFile = {
            originalname: file.originalname,
            mimetype: isVideo ? 'audio/mp4' : file.mimetype, // Adjust for video
            size: file.size,
          };

          // Get OpenAI STT schema
          const sttSchema = {
            url: 'https://api.openai.com/v1/audio/transcriptions',
            apiKey: OPENAI_API_KEY,
            model: 'whisper-1',
          };

          // Generate transcript using OpenAI Whisper
          console.error('[DIRECT-TRANSCRIBE] Calling OpenAI Whisper API...');
          logger.error('[direct-transcribe] Calling OpenAI Whisper API');
          
          const transcript = await sttService.sttRequest('openai', sttSchema, {
            audioBuffer,
            audioFile,
            language: req.body?.language || '',
          });
          
          console.error('[DIRECT-TRANSCRIBE] Transcript received, length:', transcript?.length || 0);
          logger.error('[direct-transcribe] Transcript received', { length: transcript?.length || 0 });

          // Clean up temporary files
          if (shouldDeleteAudio && audioPath !== file.path) {
            try {
              await fs.unlink(audioPath);
            } catch (error) {
              console.error('[DIRECT-TRANSCRIBE] Error deleting extracted audio:', error);
              logger.error('[direct-transcribe] Error deleting extracted audio:', error);
            }
          }

          cleanup = false; // File is stored, don't delete

          // Return transcript and file info
          console.error('[DIRECT-TRANSCRIBE] Success! Returning transcript response');
          logger.error('[direct-transcribe] Success! Returning transcript response');
          
          return res.json({
            transcript,
            file_id: fileId,
            filename: file.originalname,
            stored_path: storedPath,
            size: file.size,
            mimetype: file.mimetype,
          });
        }

        // Handle text-based files - read and return content
        if (isText) {
          console.error('[DIRECT-TRANSCRIBE] Processing text file:', file.originalname);
          logger.error('[direct-transcribe] Processing text file:', file.originalname);
          
          try {
            const content = await fs.readFile(file.path, 'utf-8');
            cleanup = false;
            
            console.error('[DIRECT-TRANSCRIBE] Text file read successfully, length:', content?.length || 0);
            logger.error('[direct-transcribe] Text file read successfully', { length: content?.length || 0 });
            
            return res.json({
              content,  // New field for file content
              file_id: fileId,
              filename: file.originalname,
              stored_path: storedPath,
              size: file.size,
              mimetype: file.mimetype,
            });
          } catch (error) {
            // Handle encoding errors
            console.error('[DIRECT-TRANSCRIBE] Error reading text file:', error);
            logger.error('[direct-transcribe] Error reading text file:', error);
            return res.status(500).json({ 
              message: 'Error reading file content: ' + error.message 
            });
          }
        }

        // Handle other file types (PDF, DOCX, etc.)
        // For now, return file metadata and indicate content extraction needed
        // Future enhancement: Add PDF/DOCX parsing libraries
        console.error('[DIRECT-TRANSCRIBE] Processing other file type:', file.mimetype);
        logger.error('[direct-transcribe] Processing other file type:', file.mimetype);
        
        cleanup = false;
        return res.json({
          content: `[File: ${file.originalname}]\n\nFile uploaded successfully. Content extraction for ${file.mimetype} files coming soon.`,
          file_id: fileId,
          filename: file.originalname,
          stored_path: storedPath,
          size: file.size,
          mimetype: file.mimetype,
          note: 'Content extraction not yet implemented for this file type',
        });
      } catch (error) {
        console.error('[DIRECT-TRANSCRIBE] ===== ERROR PROCESSING FILE =====');
        console.error('[DIRECT-TRANSCRIBE] Error:', error.message);
        console.error('[DIRECT-TRANSCRIBE] Stack:', error.stack);
        logger.error('[/files/direct-transcribe] Error processing file:', error);
        logger.error('[/files/direct-transcribe] Error details:', {
          message: error.message,
          stack: error.stack,
          file: file?.originalname,
          mimetype: file?.mimetype,
        });
        
        let message = 'Error processing file';
        if (error.message?.includes('API key')) {
          message = 'OpenAI API key error. Please check your OPENAI_API_KEY configuration.';
        } else if (error.message?.includes('file size')) {
          message = 'File size exceeds limit. Maximum size is 25MB for OpenAI Whisper.';
        } else {
          message = error.message || message;
        }

        try {
          if (cleanup && file?.path) {
            await fs.unlink(file.path);
          }
        } catch (unlinkError) {
          console.error('[DIRECT-TRANSCRIBE] Error deleting file:', unlinkError);
          logger.error('[/files/direct-transcribe] Error deleting file:', unlinkError);
        }

        // Return error with consistent structure
        return res.status(500).json({ 
          message,
          error: true,
          file_id: file ? crypto.randomUUID() : null,
          filename: file?.originalname || 'unknown',
        });
      } finally {
        if (cleanup && file?.path) {
          try {
            await fs.unlink(file.path);
          } catch (error) {
            console.error('[DIRECT-TRANSCRIBE] Error deleting temp file:', error);
            logger.error('[/files/direct-transcribe] Error deleting temp file:', error);
          }
        }
      }
    }); // Close multer callback
  } catch (error) {
    // Error in route handler setup (before multer)
    console.error('[DIRECT-TRANSCRIBE] ===== FATAL ERROR IN ROUTE SETUP =====');
    console.error('[DIRECT-TRANSCRIBE] Error:', error.message);
    console.error('[DIRECT-TRANSCRIBE] Stack:', error.stack);
    logger.error('[direct-transcribe] Fatal error in route setup:', error);
    return res.status(500).json({ 
      message: 'Internal server error: ' + error.message,
      error: true,
    });
  }
}); // Close route handler

// Log route registration on startup - USE ERROR LEVEL TO ENSURE VISIBILITY
logger.error('========================================');
logger.error('[FILES ROUTER] Direct-transcribe route registered at POST /direct-transcribe');
logger.error('[FILES ROUTER] Total routes in files router:', router.stack.length);
const directTranscribeRoute = router.stack.find(layer => 
  layer.route?.path === '/direct-transcribe' && layer.route?.methods?.post
);
if (directTranscribeRoute) {
  logger.error('[FILES ROUTER] ✓ Direct-transcribe route FOUND in stack');
} else {
  logger.error('[FILES ROUTER] ✗ Direct-transcribe route NOT found in stack!');
  logger.error('[FILES ROUTER] Available routes:', JSON.stringify(router.stack.map(layer => ({
    path: layer.route?.path,
    methods: layer.route?.methods
  })), null, 2));
}
logger.error('========================================');

module.exports = router;
