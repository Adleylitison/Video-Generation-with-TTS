import { Client } from "@gradio/client";

/**
 * Function to call the TTS model via Hugging Face Space
 * @param text - the text to convert into speech
 * @param voiceRefUrl - URL or Blob of the voice reference file
 * @param emotionRefUrl - URL or Blob of the emotion reference file
 */
export async function generateSpeech(
  text: string,
  voiceRefUrl: string,
  emotionRefUrl: string
) {
  // load the voice reference audio file
  const voiceResponse = await fetch(voiceRefUrl);
  const voiceBlob = await voiceResponse.blob();

  const emotionResponse = await fetch(emotionRefUrl);
  const emotionBlob = await emotionResponse.blob();

  // connect to the Hugging Face Space
  const client = await Client.connect("IndexTeam/IndexTTS-2-Demo");

  // call the /gen_single endpoint
  const result = await client.predict("/gen_single", {
    emo_control_method: "Same as the voice reference",
    prompt: voiceBlob,
    text: text,
    emo_ref_path: emotionBlob,
    emo_weight: 0.8,
    vec1: 0,
    vec2: 0,
    vec3: 0,
    vec4: 0,
    vec5: 0,
    vec6: 0,
    vec7: 0,
    vec8: 0,
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

  return result.data; // returned data (usually an audio link or blob)
}
