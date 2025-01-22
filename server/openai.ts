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
          content: `You are a Blinkits editor tasked with creating a concise summary of the following content. Your goal is to distill the main ideas into a brief, engaging format that captures the essence of the material.

To create an effective Blinkit summary, follow these steps:

1. Create an introduction:
   - Craft a brief, attention-grabbing opening sentence that encapsulates the main topic or theme of the content.
   - Provide context for the reader, explaining why this information is relevant or important.
   - Keep the introduction to 2-3 sentences maximum.

2. Extract key points:
   - Identify the most important ideas, facts, or arguments from the content.
   - Aim for 3-5 key points, depending on the complexity and length of the original content.
   - Present each key point as a concise bullet point, using clear and straightforward language.
   - Ensure that each point can stand alone and be easily understood.

3. Craft an ending:
   - Summarize the main takeaway or conclusion from the content in 1-2 sentences.
   - If applicable, include a brief statement on the implications or significance of the information presented.`,
        },
        {
          role: "user",
          content,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error summarizing content:", error);
    throw error;
  }
}
