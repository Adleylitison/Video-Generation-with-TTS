import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

/**
 * Pads audio file with silence to reach target duration
 * @param inputPath - Path to input audio file
 * @param targetDuration - Desired duration in seconds
 * @param outputPath - Optional output path (defaults to _padded suffix)
 * @returns Path to padded audio file
 */
export async function padAudioWithSilence(
  inputPath: string,
  targetDuration: number,
  outputPath?: string
): Promise<string> {
  const output = outputPath || inputPath.replace(/(\.\w+)$/, '_padded$1');
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .input('anullsrc=r=44100:cl=stereo')
      .inputFormat('lavfi')
      .complexFilter([
        // Pad the audio with silence to reach target duration
        `[0:a]apad=whole_dur=${targetDuration}[padded]`
      ])
      .map('[padded]')
      .audioCodec('pcm_s16le')
      .audioFrequency(44100)
      .audioChannels(2)
      .format('wav')
      .save(output)
      .on('end', () => {
        console.log(`[AudioUtils] Padded audio to ${targetDuration}s: ${output}`);
        resolve(output);
      })
      .on('error', (err) => {
        console.error(`[AudioUtils] Error padding audio:`, err);
        reject(err);
      });
  });
}

/**
 * Gets audio duration using ffprobe
 * @param audioPath - Path to audio file
 * @returns Duration in seconds
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const duration = metadata.format.duration;
      if (!duration) {
        reject(new Error('Could not determine audio duration'));
        return;
      }
      
      // Round UP to ensure video is never shorter than audio
      resolve(Math.ceil(duration * 10) / 10 + 0.1);
    });
  });
}
