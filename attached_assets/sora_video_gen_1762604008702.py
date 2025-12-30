import os
import requests
import time
from datetime import datetime

class SoraVideoGenerator:
    """
    Sora 2 Video Generator using muapi.ai API
    Correct endpoint structure based on official documentation
    """
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.muapi.ai/api/v1"
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }
    
    def generate_video(self, prompt, output_dir="sora_videos", duration="10s", resolution="720p", aspect_ratio="16:9"):
        """Generate video using muapi.ai Sora 2 API"""
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\nGenerating video for prompt: '{prompt}'")
        print(f"Settings: {duration}, {resolution}, {aspect_ratio}")
        
        payload = {
            "prompt": prompt,
            "duration": duration,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio
        }
        
        try:
            # Submit generation request
            print("\n[1/3] Submitting video generation task...")
            response = requests.post(
                f"{self.base_url}/openai-sora-2-text-to-video",
                headers=self.headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code != 200:
                print(f"✗ Error: {response.status_code}")
                print(f"Response: {response.text}")
                return None
            
            result = response.json()
            request_id = result.get("request_id")
            
            if not request_id:
                print(f"✗ No request_id in response: {result}")
                return None
            
            print(f"✓ Task submitted! Request ID: {request_id}")
            
            # Poll for completion
            print("\n[2/3] Waiting for video generation...")
            video_url = self._poll_status(request_id)
            
            if video_url:
                print("\n[3/3] Downloading video...")
                filename = self._download_video(video_url, prompt, output_dir)
                print(f"\n✓ SUCCESS! Video saved to: {filename}")
                return filename
            else:
                print("\n✗ Failed to generate video")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"\n✗ Network Error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response: {e.response.text}")
            return None
    
    def _poll_status(self, request_id, max_wait=600, poll_interval=5):
        """Poll muapi.ai for video completion - correct endpoint"""
        poll_url = f"{self.base_url}/predictions/{request_id}/result"
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            try:
                response = requests.get(
                    poll_url,
                    headers={"x-api-key": self.api_key},
                    timeout=30
                )
                
                if response.status_code != 200:
                    print(f"\n✗ Error polling: {response.status_code} - {response.text}")
                    return None
                
                result = response.json()
                status = result.get("status", "unknown")
                
                if status == "completed":
                    outputs = result.get("outputs", [])
                    if outputs and len(outputs) > 0:
                        video_url = outputs[0]
                        print(f"\n✓ Video generation completed!")
                        return video_url
                    else:
                        print(f"\n✗ No video URL in completed response")
                        return None
                        
                elif status == "failed":
                    error = result.get("error", "Unknown error")
                    print(f"\n✗ Generation failed: {error}")
                    return None
                
                else:
                    elapsed = int(time.time() - start_time)
                    print(f"   Status: {status}... ({elapsed}s elapsed)", end='\r')
                    time.sleep(poll_interval)
                
            except requests.exceptions.RequestException as e:
                print(f"\n✗ Error checking status: {e}")
                time.sleep(poll_interval)
        
        print(f"\n✗ Timeout after {max_wait}s")
        return None
    
    def _download_video(self, url, prompt, output_dir):
        """Download video from URL"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_prompt = "".join(c for c in prompt[:50] if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_prompt = safe_prompt.replace(' ', '_')
        filename = os.path.join(output_dir, f"{timestamp}_{safe_prompt}.mp4")
        
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    print(f"   Progress: {percent:.1f}%", end='\r')
        
        print()  # New line
        return filename


def generate_random_prompts(count=5):
    """Generate creative video prompts automatically"""
    import random
    
    subjects = [
        "A majestic dragon", "A futuristic city", "An ancient forest",
        "A cyberpunk street", "A mystical portal", "A steampunk airship",
        "A neon-lit alley", "A crystal cave", "A floating island",
        "A cosmic nebula", "An underwater palace", "A desert oasis",
        "A snow-covered mountain", "A tropical beach", "A volcanic landscape",
        "A medieval castle", "A space station", "A magical library",
        "A robotic factory", "A enchanted garden"
    ]
    
    actions = [
        "transforming at sunset", "emerging from the mist", "glowing with energy",
        "surrounded by lightning", "reflecting in water", "bathed in golden light",
        "illuminated by moonlight", "crackling with electricity", "shrouded in fog",
        "radiating rainbow colors", "pulsing with power", "dancing with particles",
        "shifting through dimensions", "erupting with life", "frozen in time"
    ]
    
    details = [
        "with cinematic lighting", "in photorealistic detail", "with dramatic atmosphere",
        "in stunning 4K quality", "with epic scale", "with intricate details",
        "with vibrant colors", "with ethereal beauty", "with dynamic motion",
        "with breathtaking perspective", "with perfect composition", "with magical effects"
    ]
    
    prompts = []
    for _ in range(count):
        subject = random.choice(subjects)
        action = random.choice(actions)
        detail = random.choice(details)
        prompt = f"{subject} {action}, {detail}"
        prompts.append(prompt)
    
    return prompts


def main():
    print("=" * 70)
    print("         SORA 2 VIDEO GENERATOR - muapi.ai")
    print("=" * 70)
    print("\nCost: $0.25 per 10-second video")
    print("Note: You need to add credits to your muapi.ai account first")
    print("      Visit: https://muapi.ai")
    print("\n" + "=" * 70)
    
    # Get API key
    api_key = os.getenv("MUAPI_API_KEY")
    
    if not api_key:
        print("\n📝 To get your muapi.ai API key:")
        print("   1. Go to: https://muapi.ai")
        print("   2. Sign up and log in")
        print("   3. Add credits to your account (Billing section)")
        print("   4. Copy your API key from dashboard")
        api_key = "8279cf3c24994376921898eae0faac63ad512362186f3ae880f47db5dcb6202c"
    
    if not api_key:
        print("✗ API key is required!")
        return
    
    # Initialize generator
    generator = SoraVideoGenerator(api_key)
    
    # Get video settings
    print("\n" + "=" * 70)
    print("Video Settings:")
    duration = input("Duration (5s/10s/15s/20s) [10s]: ").strip() or "10s"
    resolution = input("Resolution (720p/1080p) [720p]: ").strip() or "720p"
    aspect_ratio = input("Aspect ratio (16:9/9:16/1:1) [16:9]: ").strip() or "16:9"
    
    # Get prompts
    print("\n" + "=" * 70)
    print("Prompt Mode:")
    print("1. Auto-generate creative prompts (recommended)")
    print("2. Enter your own prompts manually")
    mode = input("Choose mode (1 or 2) [1]: ").strip() or "1"
    
    prompts = []
    
    if mode == "1":
        num_videos = input("\nHow many videos to generate? [3]: ").strip()
        num_videos = int(num_videos) if num_videos.isdigit() else 3
        
        prompts = generate_random_prompts(num_videos)
        print(f"\n✓ Generated {len(prompts)} creative prompts:")
        for i, p in enumerate(prompts, 1):
            print(f"   {i}. {p}")
    else:
        print("\nEnter your video prompts (press Enter with empty prompt to finish):")
        while True:
            prompt = input(f"Prompt #{len(prompts)+1}: ").strip()
            if not prompt:
                if not prompts:
                    prompts.append("A serene lake at sunset with mountains in the background")
                    print("Using default prompt.")
                break
            prompts.append(prompt)
    
    # Generate videos
    print("\n" + "=" * 70)
    print(f"Generating {len(prompts)} video(s)...")
    print("=" * 70)
    
    successful = 0
    failed = 0
    
    for i, prompt in enumerate(prompts, 1):
        print(f"\n{'='*70}")
        print(f"Video {i}/{len(prompts)}")
        print(f"{'='*70}")
        
        result = generator.generate_video(
            prompt=prompt,
            duration=duration,
            resolution=resolution,
            aspect_ratio=aspect_ratio
        )
        
        if result:
            successful += 1
        else:
            failed += 1
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"✓ Successful: {successful}")
    print(f"✗ Failed: {failed}")
    print(f"📁 Videos saved in: {os.path.abspath('sora_videos')}")
    print("=" * 70)


if __name__ == "__main__":
    main()