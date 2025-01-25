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
          content: `You are a Blinkits editor tasked with creating a        concise summary of the following content. Your goal is to distill the main ideas into a brief, engaging format that captures the essence of the material.   
follow these steps: Create an introduction:
	1. Craft a brief, attention-grabbing opening sentence that encapsulates the main topic or theme of the content.
	   2. Provide context for the reader, explaining why this information is relevant or important.
	   3. Keep the introduction to 2-3 sentences maximum.
	
	Extract key points:
	1. Identify the most important ideas, facts, or arguments from the content.
	   2. Aim for 3-5 key points, depending on the complexity and length of the original content.
	   3. Present each key point as a concise bullet point, using clear and straightforward language.
	   4. Ensure that each point can stand alone and be easily understood.
	
	Craft an ending:
	1. Summarize the main takeaway or conclusion from the content in 1-2 sentences.
	   2. If applicable, include a brief statement on the implications or significance of the information presented.
	3. Create 5 follow up questions 
	- Act like perplexity app and offer 5 follow up questions suggested to ask about this transcript	

	Format your response as a JSON object with the following structure:
{
  "intro": "Brief introduction text",
  "key_points": ["point 1", "point 2", "point 3"],
  "ending": "Brief conclusion text",
  "tag": "tag of the topic"
}
Remember to use clear, concise language throughout your summary. Avoid jargon or complex terminology unless absolutely necessary. Your goal is to make the information accessible and easy to understand for a general audience.`
          
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