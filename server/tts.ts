import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function textToSpeech(text: string): Promise<string> {
  try {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // In a production environment, you would upload this to S3 or similar
    // For now, we'll encode it as a data URL
    return `data:audio/mpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
}
