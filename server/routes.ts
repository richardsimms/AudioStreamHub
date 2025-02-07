
import { simpleParser } from 'mailparser/lib/index.js';

import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contents, users } from "@db/schema";
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

  // Email webhook endpoint for Mailgun - handle both GET and POST
  app.all("/api/email/incoming", async (req, res) => {
    try {
      console.log("=== Starting Email Processing ===");
      console.log("Received webhook request method:", req.method);
      console.log("Received webhook request headers:", req.headers);
      console.log("Received webhook request body:", JSON.stringify(req.body, null, 2));
      
      // For test purposes, use test user (ID: 999)
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, 999))
        .limit(1);
      
      console.log("Found user:", user);

      // For GET requests, return a success message (useful for webhook verification)
      if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', message: 'Email webhook endpoint is active' });
      }

      // Extract email data from Mailgun webhook payload
      const {
        sender,
        from,
        recipient,
        subject,
        'body-plain': bodyPlain,
        'stripped-text': strippedText,
        'message-headers': messageHeaders,
        timestamp,
        signature,
        token,
        'body-mime': bodyMime,
        'body-html': bodyHtml
      } = req.body;

      console.log("Processing email data with details:", {
        hasBodyMime: !!bodyMime,
        hasBodyHtml: !!bodyHtml,
        hasStrippedText: !!strippedText,
        hasBodyPlain: !!bodyPlain,
        emailSubject: subject,
        contentType: req.headers['content-type']
      });

      // Parse the MIME message if available
      let contentToProcess = null;
      
      if (bodyMime) {
        const parsed = await simpleParser(bodyMime);
        contentToProcess = parsed.text || parsed.html || null;
      }
      
      // Fallback to pre-processed content from Mailgun
      if (!contentToProcess) {
        contentToProcess = strippedText || bodyPlain;
      }

      if (!contentToProcess) {
        return res.status(400).json({ error: "No content found in email" });
      }

      // Use the sender's email or 'from' field to find the corresponding user
      const senderEmail = sender || (from && from.match(/<(.+)>/) ? from.match(/<(.+)>/)[1] : from);
      if (!senderEmail) {
        return res.status(400).json({ error: "No sender email found" });
      }

      // We already have the user from above, no need to query again

        
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if this is a verification email
      const verificationLink = await processVerificationLink(contentToProcess);
      
      console.log("Creating content entry with:", {
        userId: user.id,
        title: subject || "Untitled",
        contentLength: contentToProcess?.length,
        sourceEmail: senderEmail,
      });

      // Create content entry
      const [content] = await db
        .insert(contents)
        .values({
          userId: user.id,
          title: subject || "Untitled",
          originalContent: contentToProcess,
          sourceEmail: senderEmail,
          isProcessed: false,
          metadata: verificationLink ? {
            type: 'verification',
            link: verificationLink,
            status: 'processed'
          } : undefined
        })
        .returning();
      
      console.log("Content created successfully:", content);

      // Process content asynchronously
      processContent(content.id).catch(error => {
        console.error("Error processing content:", error);
      });

      res.status(200).json({
        message: "Email received and queued for processing",
        contentId: content.id
      });
    } catch (error) {
      console.error("Error processing email webhook:", error);
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

  app.delete("/api/contents/:id", async (req, res) => {
    try {
      await db.delete(contents).where(eq(contents.id, parseInt(req.params.id)));
      res.status(200).json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete content"
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

    // Generate audio with TTS using the summary
    const summaryText = [
      (summary as any).intro,
      ...(summary as any).key_points,
      (summary as any).ending
    ].join('. ');
    const audioUrl = await textToSpeech(summaryText);
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