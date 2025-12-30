/**
 * Duration policy for handling Sora API constraints
 * Sora-2 only accepts 4, 8, or 12 second video durations
 */

export type SoraDuration = 4 | 8 | 12;

export interface DurationDecision {
  targetDuration: SoraDuration;
  actualDuration: number;
  extensionNeeded: number;
  shouldWarn: boolean;
  warningMessage?: string;
}

/**
 * Determines the appropriate Sora video duration based on actual audio length
 * Video will be extended with freeze-frame if audio exceeds Sora's max (12s)
 * @param actualDuration - Measured TTS audio duration in seconds
 * @returns DurationDecision with target duration and extension info
 */
export function decideSoraDuration(actualDuration: number): DurationDecision {
  const rounded = Math.round(actualDuration * 10) / 10;
  
  // Choose the smallest Sora duration that fits the audio:
  // - If audio ≤4s → use 4s
  // - If audio ≤8s → use 8s
  // - If audio >8s → use 12s (max) and extend with freeze-frame if needed
  let targetDuration: SoraDuration;
  
  if (rounded <= 4.0) {
    targetDuration = 4;
  } else if (rounded <= 8.0) {
    targetDuration = 8;
  } else {
    targetDuration = 12; // Max duration, will extend if audio is longer
  }
  
  // Extension needed = how much longer audio is than video
  const extensionNeeded = Math.max(0, actualDuration - targetDuration);
  
  // Warn if audio significantly exceeds 12s
  const shouldWarn = actualDuration > 12;
  const warningMessage = shouldWarn
    ? `Script is ${actualDuration.toFixed(1)}s long. Video will be extended with freeze-frame to match.`
    : undefined;
  
  return {
    targetDuration,
    actualDuration,
    extensionNeeded,
    shouldWarn,
    warningMessage,
  };
}

/**
 * Estimates speech duration from script text
 * @param script - Input script text
 * @returns Estimated duration in seconds
 */
export function estimateSpeechDuration(script: string): DurationDecision {
  // Average speaking rate: 150 words per minute (2.5 words per second)
  const words = script.trim().split(/\s+/).length;
  const estimatedSeconds = words / 2.5;
  
  return decideSoraDuration(estimatedSeconds);
}
