const express = require('express');
const {
  createFileLimiters,
  configMiddleware,
  requireJwtAuth,
  uaParser,
  checkBan,
} = require('~/server/middleware');
const { avatar: asstAvatarRouter } = require('~/server/routes/assistants/v1');
const { avatar: agentAvatarRouter } = require('~/server/routes/agents/v1');
const { createMulterInstance } = require('./multer');

const files = require('./files');
const images = require('./images');
const avatar = require('./avatar');
const speech = require('./speech');

const initialize = async () => {
  const router = express.Router();
  
  // Add logging BEFORE auth to see ALL requests
  router.use((req, res, next) => {
    if (req.path.includes('direct-transcribe')) {
      const { logger } = require('@librechat/data-schemas');
      logger.error('[FILES ROUTER PRE-AUTH] Request to direct-transcribe:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        hasAuth: !!req.headers.authorization,
      });
    }
    next();
  });
  
  router.use(requireJwtAuth);
  router.use(configMiddleware);
  router.use(checkBan);
  router.use(uaParser);

  const upload = await createMulterInstance();
  router.post('/speech/stt', upload.single('audio'));

  /* Important: speech route must be added before the upload limiters */
  router.use('/speech', speech);

  const { fileUploadIpLimiter, fileUploadUserLimiter } = createFileLimiters();

  /** Apply rate limiters to all POST routes (excluding /speech and /direct-transcribe) */
  router.use((req, res, next) => {
    // Log ALL requests to files router for debugging
    if (req.path.includes('direct-transcribe') || req.method === 'POST') {
      const { logger } = require('@librechat/data-schemas');
      console.log('[FILES INDEX] Request received:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        url: req.url,
        baseUrl: req.baseUrl,
      });
      logger.info('[files/index] Request received', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
      });
    }
    
    // Exclude /speech and /direct-transcribe from rate limiting
    // /direct-transcribe handles its own file processing and rate limiting if needed
    if (req.method === 'POST' && !req.path.startsWith('/speech') && req.path !== '/direct-transcribe') {
      return fileUploadIpLimiter(req, res, (err) => {
        if (err) {
          const { logger } = require('@librechat/data-schemas');
          logger.error('[FILES INDEX] Rate limiter error:', err);
          return next(err);
        }
        return fileUploadUserLimiter(req, res, (err2) => {
          if (err2) {
            const { logger } = require('@librechat/data-schemas');
            logger.error('[FILES INDEX] User rate limiter error:', err2);
            return next(err2);
          }
          next();
        });
      });
    }
    next();
  });

  // Mount routers FIRST - specific routes must be registered before generic ones
  // Note: /direct-transcribe applies multer in its own handler
  const { logger } = require('@librechat/data-schemas');
  logger.error('[FILES INDEX] ===== Mounting files router at / =====');
  logger.error('[FILES INDEX] Current stack length before mount:', router.stack.length);
  
  // Add catch-all middleware BEFORE mounting to see ALL requests
  router.use('/', (req, res, next) => {
    if (req.path.includes('direct-transcribe')) {
      logger.error('[FILES INDEX MIDDLEWARE] Request intercepted:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        url: req.url,
        baseUrl: req.baseUrl,
      });
    }
    next();
  });
  
  router.use('/', files); // Includes /direct-transcribe handler (must be before generic routes)
  logger.error('[FILES INDEX] Files router mounted, new stack length:', router.stack.length);
  logger.error('[FILES INDEX] ===== Files router mount complete =====');

  // Set up multer middleware for routes that need file uploads
  // IMPORTANT: These must be set up AFTER mounting the routers so specific routes are matched first
  router.post('/', upload.single('file'));
  router.post('/images', upload.single('file'));
  router.post('/images/avatar', upload.single('file'));
  router.post('/images/agents/:agent_id/avatar', upload.single('file'));
  router.post('/images/assistants/:assistant_id/avatar', upload.single('file'));
  router.use('/images', images);
  router.use('/images/avatar', avatar);
  router.use('/images/agents', agentAvatarRouter);
  router.use('/images/assistants', asstAvatarRouter);
  
  // Log all registered routes for debugging
  logger.info('[files/index] All routes registered. Stack length:', router.stack.length);
  console.log('[FILES INDEX] Final route stack:', router.stack.map(layer => ({
    path: layer.route?.path || (layer.regexp ? layer.regexp.toString() : 'middleware'),
    method: layer.route?.methods,
    name: layer.name || 'middleware'
  })));
  
  return router;
};

module.exports = { initialize };
