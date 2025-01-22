import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contents, playlists, playlistContents } from "@db/schema";
import { summarizeContent } from "./openai";
import { setupMailgun } from "./mailgun";
import { textToSpeech } from "./tts";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Email webhook endpoint for Mailgun
  app.post("/api/email/incoming", async (req, res) => {
    try {
      // Extract email data from Mailgun webhook payload
      const {
        sender: from,
        subject,
        "body-plain": body,
        recipient: to,
        "stripped-text": strippedText,
      } = req.body;

      // Use stripped text if available, otherwise fallback to body
      const contentToProcess = strippedText || body;

      if (!contentToProcess) {
        console.error("No content found in email");
        return res.status(400).send("No content found in email");
      }

      // Create content entry
      const [content] = await db.insert(contents).values({
        title: subject || "Untitled",
        originalContent: contentToProcess,
        sourceEmail: from,
        isProcessed: false,
      }).returning();

      // Process content asynchronously
      processContent(content.id).catch(error => {
        console.error("Error processing content:", error);
      });

      // Respond to Mailgun webhook
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

  // Get all contents
  app.get("/api/contents", async (req, res) => {
    try {
      const allContents = await db.select().from(contents);
      res.json(allContents);
    } catch (error) {
      console.error("Error fetching contents:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch contents"
      });
    }
  });

  // Get all playlists
  app.get("/api/playlists", async (req, res) => {
    try {
      const allPlaylists = await db.select().from(playlists);
      res.json(allPlaylists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch playlists"
      });
    }
  });

  // Get contents for a playlist
  app.get("/api/playlists/:id/contents", async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const items = await db
        .select({
          content: contents,
        })
        .from(playlistContents)
        .where(eq(playlistContents.playlistId, playlistId))
        .innerJoin(contents, eq(playlistContents.contentId, contents.id))
        .orderBy(playlistContents.order);

      res.json(items.map(item => item.content));
    } catch (error) {
      console.error("Error fetching playlist contents:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch playlist contents"
      });
    }
  });

  // RSS feed for a user's content
  app.get("/api/feed/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userContents = await db
        .select()
        .from(contents)
        .where(eq(contents.userId, userId))
        .orderBy(contents.createdAt);

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

function generateRSSFeed(contents: any[]): string {
  const items = contents
    .map(
      (content) => `
      <item>
        <title>${content.title}</title>
        <description>${content.summary ? JSON.stringify(content.summary) : ''}</description>
        <enclosure url="${content.audioUrl}" type="audio/mpeg" length="0"/>
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
        <link>${process.env.APP_URL || 'http://localhost:5000'}</link>
        <description>Your personalized audio content feed</description>
        <language>en-us</language>
        ${items}
      </channel>
    </rss>`;
}