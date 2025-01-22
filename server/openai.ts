import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function summarizeContent(content: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a Blinkits editor tasked with creating a concise summary of the following content. Your goal is to distill the main ideas into a brief, engaging format that captures the essence of the material. Format your response as a JSON object with the following structure:
{
  "intro": "Brief introduction text",
  "key_points": ["point 1", "point 2", "point 3"],
  "ending": "Brief conclusion text"
}`
        },
        {
          role: "user",
          content,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(result);
  } catch (error) {
    console.error("Error summarizing content:", error);
    throw error;
  }
}