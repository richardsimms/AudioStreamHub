
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function summarizeContent(content: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a Blinkits editor tasked with creating a concise summary and identifying topics. Your goal is to distill the main ideas into a brief, engaging format and provide relevant topic tags.
          
Follow these steps:
1. Create a brief introduction (2-3 sentences)
2. Extract 3-5 key points
3. Craft a brief ending (1-2 sentences)
4. Generate 5 follow-up questions
5. Generate 1-3 relevant topic tags that best categorize this content
          
Format your response as a JSON object with the following structure:
{
  "intro": "Brief introduction text",
  "key_points": ["point 1", "point 2", "point 3"],
  "ending": "Brief conclusion text",
  "follow_up_questions": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "tags": ["tag1", "tag2", "tag3"]
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
