interface CometAPIRequest {
  model: string;
  prompt: string;
  seconds?: string;
  size?: string;
}

interface CometAPIResponse {
  id: string;
  status: string;
  video_url?: string;
  url?: string;
  output?: { video_url?: string; url?: string };
  outputs?: string[];
  error?: string | null;
}

export class SoraVideoService {
  private apiKey: string;
  private baseUrl = 'https://api.cometapi.com/v1';

  constructor() {
    this.apiKey = process.env.COMETAPI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('COMETAPI_API_KEY environment variable is required');
    }
    console.log(`[Sora] Using CometAPI with key length: ${this.apiKey.length}`);
  }

  private getHeaders(): Record<string, string> {
    // CometAPI uses Bearer token auth
    const authHeader = this.apiKey.startsWith('Bearer ') 
      ? this.apiKey 
      : `Bearer ${this.apiKey}`;
    return {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    };
  }

  async generateVideo(
    prompt: string,
    resolution: '720p' | '1080p' = '1080p',
    aspectRatio: '16:9' | '9:16' | '1:1' = '9:16',
    duration?: number
  ): Promise<string> {
    console.log(`[Sora] Submitting video generation task for prompt: "${prompt.substring(0, 100)}..."`);
    console.log(`[Sora] Settings: ${resolution}, ${aspectRatio}${duration ? `, ${duration}s duration` : ''}`);

    // Convert to CometAPI format
    // sora-2 only supports: 720x1280 (vertical), 1280x720 (horizontal)
    let size = '720x1280'; // Default vertical
    if (aspectRatio === '9:16') {
      size = '720x1280';
    } else if (aspectRatio === '16:9') {
      size = '1280x720';
    } else {
      size = '720x720'; // Square
    }

    const payload: CometAPIRequest = {
      model: 'sora-2',
      prompt,
      seconds: duration ? String(duration) : '8',
      size,
    };

    console.log(`[Sora] Payload:`, JSON.stringify(payload));

    const response = await fetch(`${this.baseUrl}/videos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sora API error (${response.status}): ${errorText}`);
    }

    const result: CometAPIResponse = await response.json();
    console.log(`[Sora] Initial response:`, JSON.stringify(result));
    
    const taskId = result.id;

    if (!taskId) {
      throw new Error('No task ID received from Sora API');
    }

    console.log(`[Sora] Task submitted successfully. Task ID: ${taskId}`);

    const videoUrl = await this.pollForCompletion(taskId);
    console.log(`[Sora] Video generation completed: ${videoUrl}`);
    
    return videoUrl;
  }

  private async pollForCompletion(
    taskId: string,
    maxWaitSeconds: number = 600,
    pollIntervalSeconds: number = 5
  ): Promise<string> {
    const pollUrl = `${this.baseUrl}/videos/${taskId}`;
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    console.log(`[Sora] Polling for completion at: ${pollUrl} (max wait: ${maxWaitSeconds}s)...`);

    while (Date.now() - startTime < maxWaitMs) {
      const response = await fetch(pollUrl, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Sora] Error polling status: ${response.status} - ${errorText}`);
        await this.sleep(pollIntervalSeconds * 1000);
        continue;
      }

      const result: any = await response.json();
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      // Log full response every 30s for debugging
      if (elapsedSeconds % 30 === 0) {
        console.log(`[Sora] Full poll response:`, JSON.stringify(result));
      }
      
      // CometAPI response structure: { code: "success", data: { status: "SUCCESS", data: { ... } } }
      const outerStatus = (result.data?.status || '').toUpperCase();
      const innerStatus = (result.data?.data?.status || '').toLowerCase();
      const progress = result.data?.progress || result.data?.data?.progress;
      
      // Check for video URL in various locations
      const videoUrl = result.video_url 
        || result.url
        || result.data?.video_url
        || result.data?.url
        || result.data?.data?.video_url
        || result.data?.data?.url
        || result.data?.data?.output_url
        || result.data?.output_url;

      // Check if completed
      const isCompleted = outerStatus === 'SUCCESS' || innerStatus === 'completed' || progress === '100%' || progress === 100;
      const isFailed = outerStatus === 'FAILED' || outerStatus === 'ERROR' || innerStatus === 'failed' || result.data?.fail_reason;

      if (isCompleted) {
        if (videoUrl) {
          console.log(`[Sora] ✓ Video generation completed after ${elapsedSeconds}s`);
          return videoUrl;
        } else {
          // CometAPI might need a separate fetch call to get the video URL
          // Try fetching from a download endpoint
          const videoId = result.data?.task_id || result.data?.data?.id || taskId;
          console.log(`[Sora] ✓ Completed after ${elapsedSeconds}s, fetching video URL for ${videoId}...`);
          const downloadUrl = await this.getVideoDownloadUrl(videoId);
          if (downloadUrl) {
            return downloadUrl;
          }
          console.log('[Sora] Completed but no URL found - Full response:', JSON.stringify(result));
          throw new Error('No video URL in completed response');
        }
      } else if (isFailed) {
        const reason = result.data?.fail_reason || result.error || 'Unknown error';
        throw new Error(`Video generation failed: ${reason}`);
      }

      console.log(`[Sora] Status: ${outerStatus || innerStatus || 'pending'}... (${elapsedSeconds}s elapsed)`);
      await this.sleep(pollIntervalSeconds * 1000);
    }

    throw new Error(`Timeout after ${maxWaitSeconds}s waiting for video generation`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getVideoDownloadUrl(videoId: string): Promise<string | null> {
    // Try to get video download URL from CometAPI
    // Some APIs require calling /videos/{id}/download or similar
    const endpoints = [
      `${this.baseUrl}/videos/${videoId}/download`,
      `${this.baseUrl}/videos/${videoId}/content`,
      `${this.baseUrl}/videos/${videoId}`,
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`[Sora] Trying to get video URL from: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: this.getHeaders(),
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          // If response is video content directly, we need to save it
          if (contentType.includes('video/')) {
            console.log(`[Sora] Got direct video stream from ${endpoint}`);
            return endpoint; // Return the URL to download from
          }

          const data: any = await response.json();
          console.log(`[Sora] Response from ${endpoint}:`, JSON.stringify(data).substring(0, 500));
          
          // Look for URL in response
          const url = data.url 
            || data.video_url 
            || data.download_url
            || data.data?.url 
            || data.data?.video_url
            || data.data?.download_url
            || data.data?.data?.url
            || data.data?.data?.video_url;
            
          if (url) {
            console.log(`[Sora] Found video URL: ${url}`);
            return url;
          }
        }
      } catch (e) {
        console.log(`[Sora] Error fetching from ${endpoint}:`, e);
      }
    }

    return null;
  }

  async downloadVideo(url: string, outputPath: string): Promise<void> {
    console.log(`[Sora] Downloading video from ${url}`);
    
    // Include auth headers for CometAPI endpoints
    const headers: Record<string, string> = {};
    if (url.includes('cometapi.com')) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }

    const fs = await import('fs');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`[Sora] Video downloaded to ${outputPath}`);
  }
}
