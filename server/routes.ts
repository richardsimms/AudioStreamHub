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
      const { from, subject, "body-plain": body } = req.body;
      
      // Create content entry
      const [content] = await db.insert(contents).values({
        title: subject,
        originalContent: body,
        sourceEmail: from,
        isProcessed: false,
      }).returning();

      // Process content asynchronously
      processContent(content.id).catch(console.error);

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error processing email:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Get all contents
  app.get("/api/contents", async (req, res) => {
    try {
      const allContents = await db.select().from(contents);
      res.json(allContents);
    } catch (error) {
      res.status(500).send("Failed to fetch contents");
    }
  });

  // Get all playlists
  app.get("/api/playlists", async (req, res) => {
    try {
      const allPlaylists = await db.select().from(playlists);
      res.json(allPlaylists);
    } catch (error) {
      res.status(500).send("Failed to fetch playlists");
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
      res.status(500).send("Failed to fetch playlist contents");
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
      res.status(500).send("Failed to generate RSS feed");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processContent(contentId: number) {
  try {
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (!content) return;

    // Generate summary with OpenAI
    const summary = await summarizeContent(content.originalContent);

    // Generate audio with TTS
    const audioUrl = await textToSpeech(content.originalContent);

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
  } catch (error) {
    console.error("Error processing content:", error);
  }
}

function generateRSSFeed(contents: any[]): string {
  const items = contents
    .map(
      (content) => `
      <item>
        <title>${content.title}</title>
        <enclosure url="${content.audioUrl}" type="audio/mpeg"/>
        <pubDate>${new Date(content.createdAt).toUTCString()}</pubDate>
        <guid>${content.id}</guid>
      </item>
    `,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Your Audio Content</title>
        <link>https://yourdomain.com</link>
        <description>Your personalized audio content feed</description>
        ${items}
      </channel>
    </rss>`;
}

setupMailgun();
