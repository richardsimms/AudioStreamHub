import formData from "form-data";
import Mailgun from "mailgun.js";
import type { Mailgun as MailgunClient } from "mailgun.js";

let mg: MailgunClient;

export function setupMailgun() {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    throw new Error("Mailgun API key and domain must be set");
  }

  const mailgun = new Mailgun(formData);
  mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY,
  });

  // Set up routes for incoming emails
  setupEmailRoutes().catch(console.error);
}

async function setupEmailRoutes() {
  try {
    // First, list existing routes
    const routes = await mg.routes.list();

    // Check if we already have a route for our domain
    const existingRoute = routes.items.find(route => 
      route.expression.includes(process.env.MAILGUN_DOMAIN!)
    );

    if (!existingRoute) {
      // Only create a new route if one doesn't exist
      await mg.routes.create({
        expression: `match_recipient(".*@${process.env.MAILGUN_DOMAIN}")`,
        action: [`forward("${process.env.APP_URL || 'http://localhost:5000'}/api/email/incoming")`, "stop()"],
        description: "Forward all incoming emails to our API",
      });
      console.log("Created new Mailgun route for email forwarding");
    } else {
      console.log("Existing Mailgun route found, skipping creation");
    }
  } catch (error) {
    console.error("Error managing Mailgun routes:", error);
    // Don't throw the error, just log it - the application can still function
    // without email processing while we debug
  }
}

export async function generateForwardingEmail(userId: number): Promise<string> {
  const timestamp = Date.now();
  return `user.${userId}.${timestamp}@${process.env.MAILGUN_DOMAIN}`;
}