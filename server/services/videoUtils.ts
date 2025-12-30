import ffmpeg from 'fluent-ffmpeg';

/**
 * Extends video by freezing the last frame to match target duration
 * @param inputPath - Path to input video file
 * @param targetDuration - Desired duration in seconds
 * @param outputPath - Optional output path (defaults to _extended suffix)
 * @returns Path to extended video file
 */
export async function extendVideoToAudioLength(
  inputPath: string,
  targetDuration: number,
  outputPath?: string
): Promise<string> {
  const output = outputPath || inputPath.replace(/(\.\w+)$/, '_extended$1');
  
  return new Promise((resolve, reject) => {
    // Get input video duration first
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const inputDuration = metadata.format.duration || 0;
      
      if (inputDuration >= targetDuration) {
        // Video is already long enough, just copy it
        console.log(`[VideoUtils] Video already ${inputDuration}s, no extension needed`);
        resolve(inputPath);
        return;
      }
      
      const extensionNeeded = targetDuration - inputDuration;
      console.log(`[VideoUtils] Extending video by ${extensionNeeded.toFixed(1)}s (freeze last frame)`);
      
      // Strategy: Extract last frame, hold it for extension duration, concat with original
      ffmpeg()
        .input(inputPath)
        .complexFilter([
          // Get last frame and hold it for the extension duration
          `[0:v]trim=start=${inputDuration - 0.1}:duration=0.1,setpts=PTS-STARTPTS[last]`,
          `[last]tpad=stop_mode=clone:stop_duration=${extensionNeeded}[freeze]`,
          // Concat original video with frozen frame
          `[0:v][freeze]concat=n=2:v=1:a=0[outv]`
        ])
        .outputOptions('-map', '[outv]')
        .outputOptions('-map', '0:a?') // Copy audio if present
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .save(output)
        .on('end', () => {
          console.log(`[VideoUtils] Video extended to ${targetDuration}s: ${output}`);
          resolve(output);
        })
        .on('error', (err) => {
          console.error(`[VideoUtils] Error extending video:`, err);
          reject(err);
        });
    });
  });
}
