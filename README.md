# AI Video + Text-to-Speech Web App

## 📖 Overview
This project is a full-stack TypeScript web application that integrates two generative AI models:
- **Sora** – for video generation  
- **Index2TTS** – for text-to-speech synthesis  

The app allows users to input text prompts and receive synchronized audiovisual output, combining generated video with natural-sounding speech. It demonstrates multimodal AI integration in a modern web environment.

---

## ✨ Features
- 🎬 Generate video clips from text using **Sora**  
- 🔊 Convert text to speech using **Index2TTS**  
- 🔗 Synchronize video and audio into a single playable file  
- ⚡ Modern frontend built with **React**, **Vite**, and **Tailwind CSS**  
- 🖥️ Backend orchestration for AI model integration  
- 📂 Temporary storage for generated media in `temp_videos/`  

---

## 🏗️ Project Structure
# Video-Generation-with-TTS


---

## ⚙️ How It Works
1. **User Input**: Text prompt entered in the frontend.  
2. **Text-to-Speech**: `ttsService.ts` sends the text to Index2TTS → returns audio.  
3. **Video Generation**: Backend sends the text to Sora → returns video.  
4. **Synchronization**: Server combines video + audio → stores in `temp_videos/`.  
5. **Playback**: Client retrieves and plays the final synchronized media.  

---

## 🚀 Installation
```bash
# Clone the repository
git clone https://github.com/your-username/ai-video-tts-app.git

# Navigate into project
cd ai-video-tts-app

# Install dependencies
npm install

# Run development server
npm run dev
