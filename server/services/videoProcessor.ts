import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { type ProcessingStatus, type ProcessingStage, type EmotionSettings } from "@shared/schema";
import { storage } from "../storage";
import { SoraVideoService } from "./soraApi";
import { uploadVideoToDrive, deleteVideoFromDrive } from "./googleDrive";
import { ttsService } from "./ttsService";
import { decideSoraDuration, estimateSpeechDuration } from "./durationPolicy";
import { padAudioWithSilence, getAudioDuration } from "./audioUtils";
import { extendVideoToAudioLength } from "./videoUtils";
import { generateSubtitleFile, escapeSubtitlePath } from "./subtitleUtils";

// Temporary directory for video processing
const TEMP_DIR = path.join(process.cwd(), "temp_videos");

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating temp directory:", error);
  }
}

ensureTempDir();

interface ProcessingJob {
  projectId: string;
  title: string;
  script: string;
  videoType: "emotive" | "informative";
  emotions?: EmotionSettings;
  onProgress: (status: ProcessingStatus) => void;
}

interface QueuedJob {
  job: ProcessingJob;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

export class VideoProcessor {
  private activeJobs: Map<string, boolean> = new Map();
  private jobQueue: QueuedJob[] = [];
  private isProcessingQueue: boolean = false;
  private readonly MAX_CONCURRENT_JOBS = 1;

  async processVideo(job: ProcessingJob): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jobQueue.push({ job, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.activeJobs.size >= this.MAX_CONCURRENT_JOBS) {
      return;
    }

    const queuedJob = this.jobQueue.shift();
    if (!queuedJob) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const result = await this.executeJob(queuedJob.job);
      queuedJob.resolve(result);
    } catch (error) {
      queuedJob.reject(error as Error);
    } finally {
      this.isProcessingQueue = false;
      // Process next job in queue
      if (this.jobQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  private async executeJob(job: ProcessingJob): Promise<string> {
    const { projectId, title, script, videoType, emotions, onProgress } = job;

    try {
      this.activeJobs.set(projectId, true);

      // Stage 1: Analyzing Script
      await this.updateProgress(onProgress, projectId, "analyzing", 10, "Extracting key themes and emotional beats");
      await this.simulateDelay(2000);

      // Stage 2: Generating TTS (Pipecat placeholder)
      await this.updateProgress(onProgress, projectId, "generating_tts", 30, "Synthesizing voiceover narration");
      let audioPath = await this.generateTTSPlaceholder(projectId, script, emotions);
      await this.simulateDelay(3000);

      // Get the ACTUAL duration of the TTS audio - this is the source of truth
      const actualAudioDuration = await getAudioDuration(audioPath);
      console.log(`[VideoProcessor] TTS audio duration: ${actualAudioDuration}s`);

      // Determine Sora video duration (max 15s) - will extend with freeze-frame for longer audio
      const durationDecision = decideSoraDuration(actualAudioDuration);
      const { targetDuration, shouldWarn, warningMessage } = durationDecision;
      
      if (shouldWarn && warningMessage) {
        console.warn(`[VideoProcessor] ${warningMessage}`);
      }
      
      // Calculate how much we need to extend the video beyond Sora's output
      const videoExtensionNeeded = Math.max(0, actualAudioDuration - targetDuration);
      console.log(`[VideoProcessor] Sora will generate: ${targetDuration}s, audio is: ${actualAudioDuration}s`);
      if (videoExtensionNeeded > 0) {
        console.log(`[VideoProcessor] Will extend video by ${videoExtensionNeeded.toFixed(1)}s to match audio`);
      }

      // Stage 3: Generating Music (Gemini placeholder) - match ACTUAL audio duration
      await this.updateProgress(onProgress, projectId, "generating_music", 50, "Composing background music");
      const musicPath = await this.generateMusicPlaceholder(projectId, videoType, actualAudioDuration);
      await this.simulateDelay(3000);

      // Stage 4: Generating Video with Sora 2
      await this.updateProgress(onProgress, projectId, "generating_video", 70, "Creating visual content with Sora 2");
      let bgVideoPath = await this.generateVideoPlaceholder(projectId, script, targetDuration);
      // No simulateDelay needed - actual API call takes time
      
      // Extend video to match ACTUAL audio duration (freeze last frame)
      if (videoExtensionNeeded > 0.1) {
        console.log(`[VideoProcessor] Extending video from ${targetDuration}s to ${actualAudioDuration}s`);
        bgVideoPath = await extendVideoToAudioLength(bgVideoPath, actualAudioDuration);
      }

      // Stage 5: Composing Final Video with FFmpeg
      await this.updateProgress(onProgress, projectId, "composing", 85, "Adding subtitles and compositing layers");
      
      // Generate timed subtitle file based on ACTUAL audio duration
      const subtitleBasePath = path.join(TEMP_DIR, `${projectId}_subtitles.ass`);
      const subtitlePath = await generateSubtitleFile(script, actualAudioDuration, subtitleBasePath);
      
      const outputPath = await this.composeVideo({
        projectId,
        audioPath,
        musicPath,
        bgVideoPath,
        script,
        title,
        subtitlePath: subtitlePath || undefined,
        audioDuration: actualAudioDuration,
      });

      // Stage 6: Upload to Google Drive (optional)
      await this.updateProgress(onProgress, projectId, "composing", 95, "Finalizing video");
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${projectId}.mp4`;
      
      try {
        const driveResult = await uploadVideoToDrive(outputPath, fileName);
        
        // Update project with Drive file information
        await storage.updateProject(projectId, {
          driveFileId: driveResult.fileId,
          driveWebViewLink: driveResult.webViewLink,
          videoUrl: `/api/projects/${projectId}/video`,
        });
        
        // Clean up local temp file after successful upload
        await this.cleanupTempFiles([outputPath]);
        
        console.log(`[VideoProcessor] Video uploaded to Google Drive: ${driveResult.fileId}`);
      } catch (driveError) {
        // Google Drive upload failed - keep video locally
        console.warn(`[VideoProcessor] Google Drive upload failed, storing locally:`, driveError);
        
        // Update project to use local video URL
        await storage.updateProject(projectId, {
          videoUrl: `/api/projects/${projectId}/video`,
        });
        
        // Keep the local file since Drive upload failed
      }

      // Complete
      await this.updateProgress(onProgress, projectId, "complete", 100, "Video generation complete");

      return projectId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.updateProgress(onProgress, projectId, "error", 0, errorMessage, errorMessage);
      throw error;
    } finally {
      this.activeJobs.delete(projectId);
    }
  }

  private async updateProgress(
    onProgress: (status: ProcessingStatus) => void,
    projectId: string,
    stage: ProcessingStage,
    progress: number,
    currentStep: string,
    error?: string
  ) {
    const status: ProcessingStatus = {
      projectId,
      stage,
      progress,
      currentStep,
      error,
    };
    
    await storage.updateProcessingStatus(status);
    onProgress(status);
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Generate TTS audio using Edge TTS (best for emotions) or fallbacks
  private async generateTTSPlaceholder(projectId: string, script: string, emotions?: EmotionSettings): Promise<string> {
    // Use .wav extension for audio format
    const audioPath = path.join(TEMP_DIR, `${projectId}_audio.wav`);
    
    // Check if emotions are active (any slider above 30%)
    const hasActiveEmotions = emotions && (
      emotions.happy > 30 || emotions.sad > 30 || emotions.angry > 30 ||
      emotions.fearful > 30 || emotions.surprised > 30 || emotions.calm > 30
    );
    
    console.log("[VideoProcessor] Emotion settings:", emotions);
    console.log("[VideoProcessor] Has active emotions:", hasActiveEmotions);
    
    // Use Edge TTS first - it has MORE NOTICEABLE emotion effects via rate/pitch
    try {
      console.log("[VideoProcessor] Using Edge TTS (best for emotions)...");
      await ttsService.generateSpeechWithEdgeTTS(script, audioPath, emotions);
      console.log("[VideoProcessor] TTS generation successful (Edge TTS)");
      return audioPath;
    } catch (edgeError) {
      console.warn("[VideoProcessor] Edge TTS failed:", edgeError);
      
      try {
        // Fallback to k2-fsa TTS (CPU-based, NO quota limits, free)
        console.log("[VideoProcessor] Falling back to k2-fsa TTS...");
        await ttsService.generateSpeechWithK2FSA(script, audioPath);
        console.log("[VideoProcessor] TTS generation successful (k2-fsa TTS)");
        return audioPath;
      } catch (k2fsaError) {
        // Last resort: silent audio
        console.warn("[VideoProcessor] All TTS methods failed, using silent audio:", k2fsaError);
        
        const estimation = estimateSpeechDuration(script);
        const words = script.trim().split(/\s+/).length;
        console.log(`[VideoProcessor] Estimated ${estimation.targetDuration}s duration based on ${words} words`);
        
        return new Promise((resolve, reject) => {
          ffmpeg()
            .input("anullsrc=r=44100:cl=stereo")
            .inputFormat("lavfi")
            .duration(estimation.targetDuration)
            .audioCodec("pcm_s16le")
            .audioFrequency(44100)
            .audioChannels(2)
            .format("wav")
            .save(audioPath)
            .on("end", () => {
              console.log(`[VideoProcessor] Silent WAV audio fallback generated (${estimation.targetDuration}s)`);
              resolve(audioPath);
            })
            .on("error", (err) => reject(err));
        });
      }
    }
  }

  // Placeholder: Generate music using Gemini with Lyra
  private async generateMusicPlaceholder(projectId: string, videoType: string, duration: number): Promise<string> {
    // In production, this would call Gemini API with Lyra to generate music
    // For now, create a placeholder silent audio file
    const musicPath = path.join(TEMP_DIR, `${projectId}_music.mp3`);
    
    console.log(`[VideoProcessor] Generating ${duration}s music track to match speech`);
    return new Promise((resolve, reject) => {
      // Generate silence as placeholder music matching the speech duration
      ffmpeg()
        .input("anullsrc=r=44100:cl=stereo")
        .inputFormat("lavfi")
        .duration(duration)
        .audioCodec("libmp3lame")
        .save(musicPath)
        .on("end", () => resolve(musicPath))
        .on("error", (err) => reject(err));
    });
  }

  // Generate background video using Sora 2 API
  private async generateVideoPlaceholder(projectId: string, script: string, audioDuration: number): Promise<string> {
    const soraService = new SoraVideoService();
    const videoPath = path.join(TEMP_DIR, `${projectId}_bg.mp4`);
    
    try {
      // Use the script as the prompt for Sora 2
      // Generate vertical video (9:16 aspect ratio) at 1080p with duration matching the speech
      console.log(`[VideoProcessor] Generating ${audioDuration}s video to match speech duration`);
      const videoUrl = await soraService.generateVideo(script, '1080p', '9:16', audioDuration);
      
      // Download the generated video
      await soraService.downloadVideo(videoUrl, videoPath);
      
      return videoPath;
    } catch (error) {
      console.error('[VideoProcessor] Sora 2 generation failed:', error);
      throw new Error(`Failed to generate video with Sora 2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if a video file has audio stream
  private async hasAudioStream(videoPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          resolve(false);
          return;
        }
        const hasAudio = metadata.streams?.some(stream => stream.codec_type === 'audio');
        resolve(hasAudio || false);
      });
    });
  }

  // Compose final video with FFmpeg
  private async composeVideo(options: {
    projectId: string;
    audioPath: string;
    musicPath: string;
    bgVideoPath: string;
    script: string;
    title: string;
    subtitlePath?: string;
    audioDuration?: number;
  }): Promise<string> {
    const { projectId, audioPath, musicPath, bgVideoPath, script, title, subtitlePath, audioDuration } = options;
    const outputPath = path.join(TEMP_DIR, `${projectId}_final.mp4`);

    // Check if background video has audio (for logging only - we never use it)
    const bgHasAudio = await this.hasAudioStream(bgVideoPath);
    console.log(`[VideoProcessor] Background video has audio: ${bgHasAudio} (will be discarded)`);
    console.log(`[VideoProcessor] Using timed subtitles: ${!!subtitlePath}`);

    return new Promise((resolve, reject) => {
      // Create a complex filter to:
      // 1. Mix audio (narration + background music ONLY - discard bg video audio)
      // 2. Add timed subtitles using ASS subtitle file
      // 3. Add static title overlay
      // 4. Maintain 1080x1920 vertical format
      
      // Escape text for FFmpeg filter - replace single quotes and backslashes
      const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/'/g, "'\\\\\\''");
      const cleanTitle = escapeText(title);
      
      // IMPORTANT: Always use only TTS audio [1:a] and music [2:a]
      // Never include background video audio [0:a] as Sora generates its own voice
      // which would conflict with our TTS narration and desync subtitles
      const audioFilter = "[1:a][2:a]amix=inputs=2:duration=first:weights=1 0.2[audio]";
      
      // Build video filter with timed subtitles or fallback to static text
      let videoFilter: string;
      if (subtitlePath) {
        // Use ASS subtitle file for timed subtitles
        // The subtitle file path needs proper escaping for FFmpeg
        const escapedSubPath = escapeSubtitlePath(subtitlePath);
        videoFilter = `[0:v]ass='${escapedSubPath}',drawtext=text='${cleanTitle}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=100:shadowcolor=black:shadowx=2:shadowy=2[video]`;
      } else {
        // Fallback: static subtitle text (first 100 chars)
        const subtitleText = script.substring(0, 100) + (script.length > 100 ? "..." : "");
        const cleanSubtitle = escapeText(subtitleText);
        videoFilter = `[0:v]drawtext=text='${cleanTitle}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=100:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='${cleanSubtitle}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=32:fontcolor=white:x=(w-text_w)/2:y=h-200:shadowcolor=black:shadowx=2:shadowy=2[video]`;
      }
      
      ffmpeg()
        .input(bgVideoPath)
        .input(audioPath)
        .input(musicPath)
        .complexFilter([
          audioFilter,
          videoFilter
        ])
        .outputOptions([
          "-map", "[video]",
          "-map", "[audio]",
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "23",
          "-c:a", "aac",
          "-b:a", "192k",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart"
        ])
        .save(outputPath)
        .on("end", () => {
          // Clean up temporary files including subtitle file
          const filesToClean = [audioPath, musicPath, bgVideoPath];
          if (subtitlePath) filesToClean.push(subtitlePath);
          this.cleanupTempFiles(filesToClean).catch(console.error);
          resolve(outputPath);
        })
        .on("error", (err) => reject(err));
    });
  }

  private async cleanupTempFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        console.error(`Error deleting ${file}:`, error);
      }
    }
  }

  async getVideoPath(projectId: string): Promise<string | undefined> {
    const outputPath = path.join(TEMP_DIR, `${projectId}_final.mp4`);
    try {
      await fs.access(outputPath);
      return outputPath;
    } catch {
      return undefined;
    }
  }

  async cleanupProject(projectId: string): Promise<void> {
    const patterns = [
      `${projectId}_audio.wav`,
      `${projectId}_audio.mp3`,
      `${projectId}_music.mp3`,
      `${projectId}_bg.mp4`,
      `${projectId}_final.mp4`,
      `${projectId}_subtitles.ass`,
    ];

    for (const pattern of patterns) {
      try {
        await fs.unlink(path.join(TEMP_DIR, pattern));
      } catch (error) {
        // File might not exist, ignore
      }
    }
  }
}

export const videoProcessor = new VideoProcessor();
