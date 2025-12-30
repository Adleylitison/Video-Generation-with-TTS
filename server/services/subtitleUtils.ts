import fs from "fs/promises";
import path from "path";

interface SubtitleSegment {
  text: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
}

// Average speaking rate in words per minute
const WORDS_PER_MINUTE = 150;
const WORDS_PER_SECOND = WORDS_PER_MINUTE / 60;

// Maximum characters per subtitle line for readability
const MAX_CHARS_PER_LINE = 40;
const MAX_WORDS_PER_SEGMENT = 8;

/**
 * Split script into subtitle segments based on natural breaks
 */
function splitIntoSegments(script: string): string[] {
  // First split by sentence-ending punctuation
  const sentences = script.split(/(?<=[.!?])\s+/);
  
  const segments: string[] = [];
  
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    
    if (words.length <= MAX_WORDS_PER_SEGMENT) {
      // Short sentence - keep as one segment
      if (sentence.trim()) {
        segments.push(sentence.trim());
      }
    } else {
      // Long sentence - split by commas, semicolons, or word count
      const clauses = sentence.split(/(?<=[,;:])\s*/);
      
      let currentSegment: string[] = [];
      let currentLength = 0;
      
      for (const clause of clauses) {
        const clauseWords = clause.trim().split(/\s+/);
        
        if (currentLength + clauseWords.length > MAX_WORDS_PER_SEGMENT && currentSegment.length > 0) {
          // Push current segment and start new one
          segments.push(currentSegment.join(" ").trim());
          currentSegment = [];
          currentLength = 0;
        }
        
        // Add clause words to current segment
        if (clause.trim()) {
          currentSegment.push(clause.trim());
          currentLength += clauseWords.length;
        }
      }
      
      // Push remaining segment
      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(" ").trim());
      }
    }
  }
  
  return segments.filter(s => s.length > 0);
}

/**
 * Calculate timing for each subtitle segment based on word count
 * Timing is calibrated for natural speech pace (~2.5 words/second)
 */
function calculateTiming(segments: string[], totalDuration: number): SubtitleSegment[] {
  // Guard against empty segments
  if (segments.length === 0 || totalDuration <= 0) {
    return [];
  }
  
  // Count total words to distribute time proportionally
  const wordCounts = segments.map(s => s.split(/\s+/).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0) || 1;
  
  // Larger buffer at start to let speech begin, smaller at end
  const startBuffer = 0.5;  // Give speech time to start
  const endBuffer = 0.2;
  const availableDuration = Math.max(1.0, totalDuration - startBuffer - endBuffer);
  
  // Calculate duration per word based on available time
  const secondsPerWord = availableDuration / totalWords;
  
  // First pass: calculate duration based on word count with minimum
  const minDuration = 1.2;  // Each subtitle stays at least 1.2s for readability
  let rawDurations = segments.map((_, i) => {
    const wordCount = wordCounts[i];
    // Add extra time for longer segments (reading time)
    const baseDuration = wordCount * secondsPerWord;
    return Math.max(minDuration, baseDuration);
  });
  
  // Second pass: normalize durations to fit within available time
  const totalRawDuration = rawDurations.reduce((a, b) => a + b, 0);
  if (totalRawDuration > availableDuration) {
    const scaleFactor = availableDuration / totalRawDuration;
    rawDurations = rawDurations.map(d => Math.max(0.8, d * scaleFactor));  // Never go below 0.8s
  }
  
  // Build timed segments with slight overlap for smoother transitions
  const timedSegments: SubtitleSegment[] = [];
  let currentTime = startBuffer;
  
  for (let i = 0; i < segments.length; i++) {
    const duration = rawDurations[i];
    // Add small overlap (0.1s) so next subtitle appears just before current ends
    const overlapBuffer = i < segments.length - 1 ? 0.1 : 0;
    const endTime = Math.min(currentTime + duration + overlapBuffer, totalDuration - endBuffer);
    
    timedSegments.push({
      text: segments[i],
      startTime: currentTime,
      endTime: endTime,
    });
    
    // Move to next segment, accounting for overlap
    currentTime = currentTime + duration;
  }
  
  return timedSegments;
}

/**
 * Format time as ASS timestamp (H:MM:SS.cc)
 */
function formatASSTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centisecs = Math.floor((seconds % 1) * 100);
  
  return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${centisecs.toString().padStart(2, "0")}`;
}

/**
 * Word wrap text to fit within max width
 */
function wrapText(text: string, maxChars: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxChars) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  // ASS uses \N for line breaks
  return lines.join("\\N");
}

/**
 * Generate ASS subtitle file content with styled subtitles
 */
function generateASSContent(segments: SubtitleSegment[]): string {
  const header = `[Script Info]
Title: AI Video Studio Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,56,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,40,40,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = segments.map((segment, index) => {
    const startTime = formatASSTime(segment.startTime);
    const endTime = formatASSTime(segment.endTime);
    const wrappedText = wrapText(segment.text, MAX_CHARS_PER_LINE);
    
    return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${wrappedText}`;
  }).join("\n");

  return header + events + "\n";
}

/**
 * Generate SRT subtitle file content (fallback format)
 */
function generateSRTContent(segments: SubtitleSegment[]): string {
  return segments.map((segment, index) => {
    const formatSRTTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
    };
    
    return `${index + 1}
${formatSRTTime(segment.startTime)} --> ${formatSRTTime(segment.endTime)}
${segment.text}
`;
  }).join("\n");
}

/**
 * Generate timed subtitle file from script
 * @param script - The full script text
 * @param audioDuration - Duration of the audio in seconds
 * @param outputPath - Where to save the subtitle file
 * @returns Path to the generated subtitle file, or null if script is empty
 */
export async function generateSubtitleFile(
  script: string,
  audioDuration: number,
  outputPath: string
): Promise<string | null> {
  console.log(`[Subtitles] Generating timed subtitles for ${audioDuration.toFixed(1)}s audio`);
  
  // Guard against empty/whitespace-only scripts
  if (!script || !script.trim()) {
    console.warn("[Subtitles] Empty script, skipping subtitle generation");
    return null;
  }
  
  // Split script into segments
  const segments = splitIntoSegments(script);
  console.log(`[Subtitles] Split into ${segments.length} segments`);
  
  // Guard against no valid segments
  if (segments.length === 0) {
    console.warn("[Subtitles] No valid segments, skipping subtitle generation");
    return null;
  }
  
  // Calculate timing for each segment
  const timedSegments = calculateTiming(segments, audioDuration);
  
  // Guard against timing calculation failure
  if (timedSegments.length === 0) {
    console.warn("[Subtitles] Timing calculation produced no segments");
    return null;
  }
  
  // Log segments for debugging
  timedSegments.forEach((seg, i) => {
    const textPreview = seg.text.length > 30 ? seg.text.substring(0, 30) + "..." : seg.text;
    console.log(`[Subtitles] Segment ${i + 1}: ${seg.startTime.toFixed(2)}s - ${seg.endTime.toFixed(2)}s: "${textPreview}"`);
  });
  
  // Generate ASS format (better styling support)
  const assContent = generateASSContent(timedSegments);
  
  // Ensure .ass extension
  const assPath = outputPath.replace(/\.\w+$/, ".ass");
  await fs.writeFile(assPath, assContent, "utf-8");
  
  console.log(`[Subtitles] Saved to ${assPath}`);
  return assPath;
}

/**
 * Escape special characters for FFmpeg subtitle filter
 */
export function escapeSubtitlePath(filePath: string): string {
  // FFmpeg requires escaping colons and backslashes in paths
  return filePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "'\\''");
}
