import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contents, type Content } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { summarizeContent } from "./openai";
import { setupMailgun, generateForwardingEmail } from "./mailgun";
import { textToSpeech } from "./tts";

export function registerRoutes(app: Express): Server {
  // Generate a test email address
  app.get("/api/test-email", async (_req, res) => {
    try {
      // Generate a test email address with ID 999 (for testing purposes)
      const testEmail = await generateForwardingEmail(999);
      res.json({ 
        email: testEmail,
        instructions: "Send an email to this address to test the email processing functionality"
      });
    } catch (error) {
      console.error("Error generating test email:", error);
      res.status(500).json({ error: "Failed to generate test email address" });
    }
  });

  // Email webhook endpoint for Mailgun
  app.post("/api/email/incoming", async (req, res) => {
    try {
      console.log("Received email webhook:", JSON.stringify(req.body, null, 2));

      // Extract email data from Mailgun webhook payload
      const {
        sender,
        recipient,
        subject,
        "body-plain": bodyPlain,
        "stripped-text": strippedText,
      } = req.body;

      // Use stripped text if available, otherwise fallback to plain body
      const contentToProcess = strippedText || bodyPlain;

      if (!contentToProcess) {
        console.error("No content found in email");
        return res.status(400).send("No content found in email");
      }

      // For test emails, we'll use a default user ID
      const userId = 999; // Using test user ID

      // Create content entry
      const [content] = await db
        .insert(contents)
        .values({
          userId,
          title: subject || "Untitled",
          originalContent: contentToProcess,
          sourceEmail: sender,
          isProcessed: false,
        })
        .returning();

      // Process content asynchronously
      processContent(content.id).catch(error => {
        console.error("Error processing content:", error);
      });

      res.status(200).json({
        message: "Email received and queued for processing",
        contentId: content.id
      });
    } catch (error) {
      console.error("Error processing email:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to process incoming email"
      });
    }
  });

  // Get all contents for the current user
  app.get("/api/contents", async (_req, res) => {
    try {
      const allContents = await db
        .select()
        .from(contents)
        .orderBy(desc(contents.createdAt));

      res.json(allContents);
    } catch (error) {
      console.error("Error fetching contents:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch contents"
      });
    }
  });

  const httpServer = createServer(app);
  setupMailgun();
  return httpServer;
}

async function processContent(contentId: number) {
  try {
    // Fetch the content to process
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (!content) {
      console.error("Content not found:", contentId);
      return;
    }

    console.log(`Processing content ${contentId}: ${content.title}`);

    // Generate summary with OpenAI
    const summary = await summarizeContent(content.originalContent);
    console.log(`Generated summary for content ${contentId}`);

    // Generate audio with TTS
    const audioUrl = await textToSpeech(content.originalContent);
    console.log(`Generated audio for content ${contentId}`);

    // Update content with summary and audio URL
    await db
      .update(contents)
      .set({
        summary,
        audioUrl,
        isProcessed: true,
        updatedAt: new Date(),
      })
      .where(eq(contents.id, contentId));

    console.log(`Successfully processed content ${contentId}`);
  } catch (error) {
    console.error("Error processing content:", error);
    throw error;
  }
}