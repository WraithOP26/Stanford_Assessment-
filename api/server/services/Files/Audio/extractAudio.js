const { exec } = require('child_process');
const { promisify } = require('util');
const { logger } = require('@librechat/data-schemas');

const execAsync = promisify(exec);

/**
 * Extracts audio from a video file using ffmpeg
 * @param {string} videoPath - Path to the video file
 * @param {string} outputPath - Path where extracted audio should be saved
 * @returns {Promise<void>}
 */
async function extractAudioFromVideo(videoPath, outputPath) {
  // First, check if the video file has an audio stream using ffprobe
  const ffmpegPath = '/usr/bin/ffmpeg';
  const ffprobePath = '/usr/bin/ffprobe';
  
  // Use ffprobe to check for audio stream (more reliable than grep)
  const probeCommand = `${ffprobePath} -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "${videoPath}" 2>&1`;
  
  try {
    // Check for audio stream
    const { stdout: probeOutput } = await execAsync(probeCommand, { timeout: 10000 });
    if (!probeOutput || probeOutput.trim() !== 'audio') {
      throw new Error('Video file does not contain an audio stream. Cannot extract audio.');
    }
  } catch (probeError) {
    // If ffprobe fails or returns empty, there's no audio stream
    if (probeError.code === 1 || !probeError.stdout || probeError.stdout.trim() !== 'audio') {
      throw new Error('Video file does not contain an audio stream. Cannot extract audio.');
    }
    // If it's a different error (like file not found), continue and let the main command handle it
    logger.warn(`[extractAudioFromVideo] Could not probe for audio stream:`, probeError.message);
  }
  
  // ffmpeg command to extract audio as WAV (compatible with Whisper API)
  // -vn: disable video
  // -acodec pcm_s16le: use PCM 16-bit little-endian (WAV format)
  // -ar 44100: sample rate 44.1kHz
  // -ac 2: stereo audio
  // -y: overwrite output file
  const command = `${ffmpegPath} -i "${videoPath}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -y "${outputPath}" 2>&1`;
  
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 300000 }); // 5 min timeout
    // ffmpeg outputs info to stderr, so we only warn on actual errors
    if (stderr && !stderr.includes('Stream mapping') && !stderr.includes('Output #0')) {
      // Check if it's just informational output
      const errorPatterns = ['Error', 'failed', 'Invalid'];
      const hasError = errorPatterns.some(pattern => stderr.toLowerCase().includes(pattern.toLowerCase()));
      if (hasError) {
        logger.warn(`[extractAudioFromVideo] ffmpeg warnings: ${stderr}`);
      }
    }
  } catch (error) {
    // Check if ffmpeg is available
    if (error.message.includes('ffmpeg: not found') || error.code === 127) {
      throw new Error('ffmpeg is not installed. Video transcription requires ffmpeg.');
    }
    if (error.killed && error.signal === 'SIGTERM') {
      throw new Error('Audio extraction timed out (exceeded 5 minutes)');
    }
    
    // Since we use 2>&1, stderr is redirected to stdout
    // Log the actual error details for debugging - show full output
    const fullOutput = error.stdout || error.stderr || '';
    console.error(`[extractAudioFromVideo] ffmpeg error:`, {
      message: error.message,
      code: error.code,
      stdoutLength: error.stdout?.length || 0,
      stderrLength: error.stderr?.length || 0,
      stdout: fullOutput.substring(0, 5000), // Show more of the output
    });
    logger.error(`[extractAudioFromVideo] ffmpeg error details:`, {
      message: error.message,
      code: error.code,
      stdout: fullOutput.substring(0, 5000),
    });
    
    // Extract the actual error message from output (skip version info)
    // ffmpeg outputs version info first, then the error
    let actualError = fullOutput;
    if (fullOutput.includes('Error')) {
      // Find lines containing "Error" but not copyright/version info
      const errorLines = fullOutput.split('\n').filter(line => 
        line.toLowerCase().includes('error') && 
        !line.includes('Copyright') && 
        !line.includes('configuration') &&
        !line.includes('built with')
      );
      if (errorLines.length > 0) {
        actualError = errorLines.join('; ');
      }
    } else if (fullOutput.length > 0) {
      // If no explicit error, show the last few lines of output
      const lines = fullOutput.split('\n');
      actualError = lines.slice(-10).join('\n');
    }
    
    // Include the actual error message (or first 1000 chars if no specific error found)
    const errorMessage = actualError && actualError.length > 0
      ? `Failed to extract audio from video: ${actualError.substring(0, 1000)}`
      : `Failed to extract audio from video: Command failed with code ${error.code}`;
    throw new Error(errorMessage);
  }
}

module.exports = { extractAudioFromVideo };

