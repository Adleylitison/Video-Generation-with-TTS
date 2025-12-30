import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

interface VeoGenerationConfig {
  prompt: string;
  aspectRatio?: "16:9" | "9:16";
  durationSeconds?: 4 | 6 | 8;
  negativePrompt?: string;
}

export class VeoVideoService {
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required for Veo");
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateVideo(
    prompt: string,
    aspectRatio: "16:9" | "9:16" = "9:16",
    durationSeconds: 4 | 6 | 8 = 8
  ): Promise<Buffer> {
    console.log(`[Veo] Submitting video generation task for prompt: "${prompt.substring(0, 100)}..."`);
    console.log(`[Veo] Settings: ${aspectRatio}, ${durationSeconds}s duration`);

    try {
      const operation = await this.client.models.generateVideos({
        model: "veo-2.0-generate-001",
        prompt: prompt,
        config: {
          aspectRatio: aspectRatio,
          numberOfVideos: 1,
        },
      });

      console.log(`[Veo] Task submitted. Polling for completion...`);

      let result = operation;
      let pollCount = 0;
      const maxPolls = 120;
      
      while (!result.done && pollCount < maxPolls) {
        pollCount++;
        console.log(`[Veo] Status: processing... (poll ${pollCount}/${maxPolls})`);
        await this.sleep(5000);
        
        if (result.name) {
          result = await this.client.operations.get({ operation: result });
        }
      }

      if (!result.done) {
        throw new Error("Timeout waiting for video generation");
      }

      if (!result.response?.generatedVideos?.[0]?.video?.videoBytes) {
        console.error("[Veo] Response:", JSON.stringify(result, null, 2));
        throw new Error("No video bytes in response");
      }

      const videoBytes = result.response.generatedVideos[0].video.videoBytes;
      const videoBuffer = Buffer.from(videoBytes, "base64");
      
      console.log(`[Veo] ✓ Video generation completed (${videoBuffer.length} bytes)`);
      return videoBuffer;
    } catch (error) {
      console.error("[Veo] Error:", error);
      throw new Error(
        `Veo video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async generateAndSaveVideo(
    prompt: string,
    outputPath: string,
    aspectRatio: "16:9" | "9:16" = "9:16",
    durationSeconds: 4 | 6 | 8 = 8
  ): Promise<string> {
    const videoBuffer = await this.generateVideo(prompt, aspectRatio, durationSeconds);
    fs.writeFileSync(outputPath, videoBuffer);
    console.log(`[Veo] Video saved to ${outputPath}`);
    return outputPath;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
