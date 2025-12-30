import { Client } from "@gradio/client";
import fs from "fs/promises";
import path from "path";
import * as EdgeTTS from "edge-tts";
import OpenAI from "openai";
import type { EmotionSettings } from "@shared/schema";

export class TTSService {
  // IMPORTANT: The default reference files are currently sine waves and won't produce
  // realistic speech. For production use, replace these with actual human voice samples:
  // - voice_reference.wav: 2-5 seconds of clear speech from your desired voice
  // - emotion_reference.wav: Speech with the emotional tone you want to convey
  // Both should be WAV format, mono or stereo, 16-24kHz sample rate
  private static readonly DEFAULT_VOICE_REF = path.join(
    process.cwd(),
    "server/assets/tts_references/voice_reference.wav"
  );
  private static readonly DEFAULT_EMOTION_REF = path.join(
    process.cwd(),
    "server/assets/tts_references/emotion_reference.wav"
  );

  /**
   * Map emotion settings to IndexTTS-2 vector parameters
   * IndexTTS-2 uses 8 emotion vectors with range 0.0-1.4:
   * vec1=Happy, vec2=Angry, vec3=Sad, vec4=Afraid, 
   * vec5=Disgusted, vec6=Melancholic, vec7=Surprised, vec8=Calm
   */
  private mapEmotionsToVectors(emotions?: EmotionSettings) {
    if (!emotions) {
      return { vec1: 0, vec2: 0, vec3: 0, vec4: 0, vec5: 0, vec6: 0, vec7: 0, vec8: 0, emoWeight: 0.6 };
    }
    
    // Convert 0-100 slider to 0.0-1.4 range for MORE OBVIOUS emotions
    // Start showing emotion at 20% (not 50%) for more sensitivity
    const toVector = (value: number) => {
      if (value <= 20) return 0;
      // 20->0, 100->1.4 (max intensity supported by IndexTTS-2)
      return Math.min(1.4, ((value - 20) / 80) * 1.4);
    };
    
    // Calculate emotion weight - use high weight for noticeable effect
    const maxEmotion = Math.max(emotions.happy, emotions.sad, emotions.angry, emotions.fearful, emotions.surprised, emotions.calm);
    // emoWeight: 0.5 = subtle, 0.8 = moderate, 1.0 = strong
    const emoWeight = maxEmotion > 70 ? 1.0 : maxEmotion > 40 ? 0.85 : 0.7;
    
    // Correct IndexTTS-2 vector mapping:
    // vec1=Happy, vec2=Angry, vec3=Sad, vec4=Afraid, vec5=Disgusted, vec6=Melancholic, vec7=Surprised, vec8=Calm
    return {
      vec1: toVector(emotions.happy),      // Happy
      vec2: toVector(emotions.angry),      // Angry
      vec3: toVector(emotions.sad),        // Sad
      vec4: toVector(emotions.fearful),    // Afraid/Fearful
      vec5: 0,                             // Disgusted (not in our UI)
      vec6: 0,                             // Melancholic (not in our UI)
      vec7: toVector(emotions.surprised),  // Surprised
      vec8: toVector(emotions.calm),       // Calm
      emoWeight,
    };
  }

  /**
   * Generate speech using IndexTTS-2 via Hugging Face Space
   * @param text - The text to convert to speech
   * @param outputPath - Where to save the generated audio
   * @param emotions - Optional emotion settings to control voice tone
   * @param voiceRefPath - Optional custom voice reference audio file path
   * @param emotionRefPath - Optional custom emotion reference audio file path
   */
  async generateSpeech(
    text: string,
    outputPath: string,
    emotions?: EmotionSettings,
    voiceRefPath?: string,
    emotionRefPath?: string
  ): Promise<string> {
    try {
      // Use default references if not provided
      const voicePath = voiceRefPath || TTSService.DEFAULT_VOICE_REF;
      const emotionPath = emotionRefPath || TTSService.DEFAULT_EMOTION_REF;

      // Read the reference audio files
      const voiceBuffer = await fs.readFile(voicePath);
      const emotionBuffer = await fs.readFile(emotionPath);

      // Create Blob objects for the Gradio client
      const voiceBlob = new Blob([voiceBuffer], { type: "audio/wav" });
      const emotionBlob = new Blob([emotionBuffer], { type: "audio/wav" });
      
      // Map emotion settings to API vectors
      const emotionVectors = this.mapEmotionsToVectors(emotions);
      console.log("[TTS] Emotion vectors:", emotionVectors);

      // Connect to the Hugging Face Space
      console.log("[TTS] Connecting to IndexTTS-2 Hugging Face Space...");
      const client = await Client.connect("IndexTeam/IndexTTS-2-Demo");

      // Call the /gen_single endpoint
      console.log("[TTS] Generating speech for text:", text.substring(0, 50) + "...");
      const result = await client.predict("/gen_single", {
        emo_control_method: "Use emotion vectors",
        prompt: voiceBlob,
        text: text,
        emo_ref_path: emotionBlob,
        emo_weight: emotionVectors.emoWeight,
        vec1: emotionVectors.vec1,
        vec2: emotionVectors.vec2,
        vec3: emotionVectors.vec3,
        vec4: emotionVectors.vec4,
        vec5: emotionVectors.vec5,
        vec6: emotionVectors.vec6,
        vec7: emotionVectors.vec7,
        vec8: emotionVectors.vec8,
        emo_text: "",
        emo_random: false,
        max_text_tokens_per_segment: 120,
        param_16: true,
        param_17: 0.8,
        param_18: 30,
        param_19: 0.8,
        param_20: 0,
        param_21: 3,
        param_22: 10,
        param_23: 1500,
      });

      // The result should contain the audio data or URL
      console.log("[TTS] Speech generation complete");

      // Validate that we got audio data back
      if (!result.data || !Array.isArray(result.data) || !result.data[0]) {
        throw new Error("TTS API returned empty or invalid response");
      }

      const audioData = result.data[0];
      let audioBuffer: ArrayBuffer | null = null;
      
      // Debug: Log what we received
      console.log("[TTS] Audio data type:", typeof audioData);
      console.log("[TTS] Audio data:", audioData instanceof Blob ? 'Blob' : JSON.stringify(audioData).substring(0, 200));
      
      // Handle different response formats
      if (typeof audioData === 'string' && audioData.startsWith('http')) {
        // If it's a URL, download it
        console.log("[TTS] Downloading from URL:", audioData);
        const response = await fetch(audioData);
        if (!response.ok) {
          throw new Error(`Failed to download audio from ${audioData}: ${response.statusText}`);
        }
        audioBuffer = await response.arrayBuffer();
      } 
      else if (typeof audioData === 'object' && audioData !== null && 'url' in audioData) {
        // If it's an object with a url property
        const url = audioData.url as string;
        console.log("[TTS] Downloading from object.url:", url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download audio from ${url}: ${response.statusText}`);
        }
        audioBuffer = await response.arrayBuffer();
      }
      else if (audioData instanceof Blob) {
        // If it's already a blob
        console.log("[TTS] Processing Blob data");
        audioBuffer = await audioData.arrayBuffer();
      }
      else if (typeof audioData === 'object' && audioData !== null && 'value' in audioData) {
        // Handle Gradio nested response with value property
        const fileObj = audioData as any;
        console.log("[TTS] Processing Gradio nested response");
        const valueData = fileObj.value;
        if (valueData && typeof valueData === 'object') {
          // Try URL first, then path
          const fileUrl = valueData.url || valueData.path;
          if (fileUrl) {
            console.log("[TTS] Downloading from nested value:", fileUrl);
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error(`Failed to download audio from ${fileUrl}: ${response.statusText}`);
            }
            audioBuffer = await response.arrayBuffer();
          } else {
            throw new Error("Gradio nested response missing url or path");
          }
        } else {
          throw new Error("Gradio response has invalid value property");
        }
      }
      else if (typeof audioData === 'object' && audioData !== null && 'path' in audioData) {
        // Handle Gradio file object with path (direct path, not nested)
        const fileObj = audioData as any;
        console.log("[TTS] Processing Gradio file object with direct path");
        if (fileObj.path) {
          const response = await fetch(fileObj.path);
          if (!response.ok) {
            throw new Error(`Failed to download audio from ${fileObj.path}: ${response.statusText}`);
          }
          audioBuffer = await response.arrayBuffer();
        } else {
          throw new Error("Gradio file object missing path");
        }
      }
      else {
        console.error("[TTS] Unexpected audio data format. Type:", typeof audioData, "Keys:", Object.keys(audioData || {}));
        throw new Error(`TTS API returned audio in an unexpected format: ${typeof audioData}`);
      }

      // Verify we actually got audio data
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        throw new Error("TTS API returned empty audio data");
      }

      // Save the audio file
      await fs.writeFile(outputPath, Buffer.from(audioBuffer));
      console.log(`[TTS] Audio saved to ${outputPath} (${audioBuffer.byteLength} bytes)`);

      return outputPath;
    } catch (error) {
      console.error("[TTS] Error generating speech:", error);
      throw new Error(
        `TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Fallback: Generate speech using Edge TTS (Microsoft)
   * This is free and doesn't have rate limits like the Hugging Face demo
   */
  async generateSpeechWithEdgeTTS(
    text: string,
    outputPath: string,
    emotions?: EmotionSettings
  ): Promise<string> {
    try {
      console.log("[EdgeTTS] Generating speech with Edge TTS fallback...");
      
      // Select voice based on emotion (Edge TTS has different voices for different styles)
      let voice = "en-US-AriaNeural"; // Default friendly female voice
      let rate = "+0%";
      let pitch = "+0Hz";
      
      if (emotions) {
        // Find dominant emotion and its intensity
        const emotionValues = [
          { name: 'happy', value: emotions.happy },
          { name: 'sad', value: emotions.sad },
          { name: 'angry', value: emotions.angry },
          { name: 'fearful', value: emotions.fearful },
          { name: 'surprised', value: emotions.surprised },
          { name: 'calm', value: emotions.calm },
        ];
        const dominant = emotionValues.reduce((a, b) => a.value > b.value ? a : b);
        const intensity = dominant.value / 100; // 0-1 scale
        
        if (dominant.value > 30) {
          // MUCH MORE DRAMATIC rate/pitch changes for noticeable effect
          switch (dominant.name) {
            case 'happy':
              voice = "en-US-JennyNeural"; // Cheerful voice
              rate = `+${Math.round(25 * intensity)}%`; // Up to +25%
              pitch = `+${Math.round(15 * intensity)}Hz`; // Higher pitch
              break;
            case 'sad':
              voice = "en-US-AriaNeural";
              rate = `-${Math.round(30 * intensity)}%`; // Much slower
              pitch = `-${Math.round(12 * intensity)}Hz`; // Lower pitch
              break;
            case 'angry':
              voice = "en-US-GuyNeural"; // Stronger voice
              rate = `+${Math.round(15 * intensity)}%`; // Faster
              pitch = `+${Math.round(8 * intensity)}Hz`; // Slightly higher
              break;
            case 'fearful':
              voice = "en-US-AriaNeural";
              rate = `+${Math.round(35 * intensity)}%`; // Very fast, nervous
              pitch = `+${Math.round(20 * intensity)}Hz`; // High, anxious
              break;
            case 'surprised':
              voice = "en-US-JennyNeural";
              rate = `+${Math.round(20 * intensity)}%`;
              pitch = `+${Math.round(25 * intensity)}Hz`; // Very high pitch
              break;
            case 'calm':
              voice = "en-US-AriaNeural";
              rate = `-${Math.round(20 * intensity)}%`; // Slow, relaxed
              pitch = `-${Math.round(5 * intensity)}Hz`; // Slightly lower
              break;
          }
          console.log(`[EdgeTTS] Dominant emotion: ${dominant.name} at ${dominant.value}%`);
        }
      }
      
      console.log(`[EdgeTTS] Using voice: ${voice}, rate: ${rate}, pitch: ${pitch}`);
      
      // Generate audio buffer
      const audioBuffer = await EdgeTTS.tts(text, {
        voice,
        rate,
        pitch,
      });
      
      // Edge TTS outputs MP3, we need to convert to WAV for consistency
      const mp3Path = outputPath.replace('.wav', '_temp.mp3');
      await fs.writeFile(mp3Path, audioBuffer);
      
      // Convert MP3 to WAV using FFmpeg
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require("fluent-ffmpeg");
        ffmpeg(mp3Path)
          .audioCodec("pcm_s16le")
          .audioFrequency(44100)
          .audioChannels(2)
          .format("wav")
          .save(outputPath)
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err));
      });
      
      // Clean up temp MP3
      await fs.unlink(mp3Path).catch(() => {});
      
      console.log(`[EdgeTTS] Audio saved to ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error("[EdgeTTS] Error:", error);
      throw new Error(
        `Edge TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Fallback: Generate speech using k2-fsa TTS (CPU-based, no GPU quota)
   * This runs on Hugging Face without GPU limits
   */
  async generateSpeechWithK2FSA(
    text: string,
    outputPath: string
  ): Promise<string> {
    try {
      console.log("[K2FSA-TTS] Generating speech with k2-fsa TTS (CPU, no quota)...");
      
      const client = await Client.connect("k2-fsa/text-to-speech");
      
      // k2-fsa TTS parameters
      const result = await client.predict("/process", {
        language: "English",
        repo_id: "csukuangfj/vits-piper-en_US-amy-low|1 speaker",
        text: text,
        sid: "0",
        speed: 1.0,
      });
      
      console.log("[K2FSA-TTS] API response received");
      
      // Extract audio data from result
      const audioData = (result.data as any[])[0];
      let audioBuffer: ArrayBuffer;
      
      if (audioData && typeof audioData === 'object' && 'url' in audioData) {
        // Gradio file object with URL
        const response = await fetch(audioData.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }
        audioBuffer = await response.arrayBuffer();
      } else if (audioData && typeof audioData === 'object' && 'path' in audioData) {
        // Gradio file object with path
        const response = await fetch(audioData.path);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }
        audioBuffer = await response.arrayBuffer();
      } else {
        throw new Error("Unexpected audio data format from k2-fsa TTS");
      }
      
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        throw new Error("Empty audio data received");
      }
      
      // Save the audio file (k2-fsa returns WAV format)
      await fs.writeFile(outputPath, Buffer.from(audioBuffer));
      console.log(`[K2FSA-TTS] Audio saved to ${outputPath} (${audioBuffer.byteLength} bytes)`);
      
      return outputPath;
    } catch (error) {
      console.error("[K2FSA-TTS] Error:", error);
      throw new Error(
        `K2FSA TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Fallback: Generate speech using OpenAI TTS API
   * This is reliable and works from any environment
   */
  async generateSpeechWithOpenAI(
    text: string,
    outputPath: string,
    emotions?: EmotionSettings
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    try {
      console.log("[OpenAI TTS] Generating speech with OpenAI TTS...");
      
      const openai = new OpenAI({ apiKey });
      
      // Select voice based on emotion
      // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
      let voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova"; // Default warm female voice
      let speed = 1.0;
      
      if (emotions) {
        const maxEmotion = Math.max(
          emotions.happy, emotions.sad, emotions.angry, 
          emotions.fearful, emotions.surprised, emotions.calm
        );
        
        if (maxEmotion > 50) {
          if (emotions.happy > 70) {
            voice = "shimmer"; // Upbeat
            speed = 1.1;
          } else if (emotions.sad > 70) {
            voice = "fable"; // Softer
            speed = 0.9;
          } else if (emotions.angry > 70) {
            voice = "onyx"; // Deeper, stronger
            speed = 1.05;
          } else if (emotions.fearful > 70) {
            voice = "echo"; // Slightly tense
            speed = 1.15;
          } else if (emotions.calm > 70) {
            voice = "alloy"; // Neutral, calm
            speed = 0.95;
          }
        }
      }
      
      console.log(`[OpenAI TTS] Using voice: ${voice}, speed: ${speed}`);
      
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice,
        input: text,
        speed,
        response_format: "mp3",
      });
      
      // Get the audio as buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // OpenAI outputs MP3, convert to WAV for consistency
      const mp3Path = outputPath.replace('.wav', '_openai_temp.mp3');
      await fs.writeFile(mp3Path, buffer);
      
      // Convert MP3 to WAV using FFmpeg
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require("fluent-ffmpeg");
        ffmpeg(mp3Path)
          .audioCodec("pcm_s16le")
          .audioFrequency(44100)
          .audioChannels(2)
          .format("wav")
          .save(outputPath)
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err));
      });
      
      // Clean up temp MP3
      await fs.unlink(mp3Path).catch(() => {});
      
      console.log(`[OpenAI TTS] Audio saved to ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error("[OpenAI TTS] Error:", error);
      throw new Error(
        `OpenAI TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Fallback: Generate silent audio if all TTS methods fail
   * This is used as a last resort to prevent the entire pipeline from failing
   */
  async generateSilentAudio(outputPath: string, duration: number = 10): Promise<string> {
    return new Promise((resolve, reject) => {
      const ffmpeg = require("fluent-ffmpeg");
      ffmpeg()
        .input("anullsrc=r=44100:cl=stereo")
        .inputFormat("lavfi")
        .duration(duration)
        .audioCodec("pcm_s16le")
        .audioFrequency(44100)
        .audioChannels(2)
        .format("wav")
        .save(outputPath)
        .on("end", () => resolve(outputPath))
        .on("error", (err: Error) => reject(err));
    });
  }
}

export const ttsService = new TTSService();
