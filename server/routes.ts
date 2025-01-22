import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contents, users, type Content } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { summarizeContent } from "./openai";
import { setupMailgun } from "./mailgun";
import { textToSpeech } from "./tts";

export function registerRoutes(app: Express): Server {
  // Email webhook endpoint for Mailgun
  app.post("/api/email/incoming", async (req, res) => {
    try {
      console.log("Received email webhook:", req.body);

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

      // Find the user based on the recipient email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.forwardingEmail, recipient))
        .limit(1);

      if (!user) {
        console.error("No user found for recipient:", recipient);
        return res.status(404).send("User not found");
      }

      // Create content entry
      const [content] = await db
        .insert(contents)
        .values({
          userId: user.id,
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
  app.get("/api/contents", async (req, res) => {
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

  // RSS feed generation endpoint
  app.get("/api/feed", async (req, res) => {
    try {
      const userContents = await db
        .select()
        .from(contents)
        .orderBy(desc(contents.createdAt))
        .limit(50);

      const feed = generateRSSFeed(userContents);
      res.type("application/xml").send(feed);
    } catch (error) {
      console.error("Error generating RSS feed:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to generate RSS feed"
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

interface Content {
  id: number;
  userId: number;
  title: string;
  originalContent: string;
  summary?: string;
  audioUrl?: string;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}


function generateRSSFeed(contents: Content[]): string {
  const items = contents
    .map(
      (content) => `
      <item>
        <title>${content.title}</title>
        <description>${content.summary ? JSON.stringify(content.summary) : ''}</description>
        ${content.audioUrl ? `<enclosure url="${content.audioUrl}" type="audio/mpeg" length="0"/>` : ''}
        <pubDate>${new Date(content.createdAt).toUTCString()}</pubDate>
        <guid isPermaLink="false">${content.id}</guid>
      </item>
    `,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
      <channel>
        <title>Your Audio Content</title>
        <link>${process.env.PUBLIC_WEBHOOK_URL}</link>
        <description>Your personalized audio content feed</description>
        <language>en-us</language>
        ${items}
      </channel>
    </rss>`;
}