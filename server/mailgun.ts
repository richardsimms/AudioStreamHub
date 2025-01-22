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
  setupEmailRoutes();
}

async function setupEmailRoutes() {
  try {
    await mg.routes.create({
      expression: `match_recipient(".*@${process.env.MAILGUN_DOMAIN}")`,
      action: [`forward("${process.env.APP_URL}/api/email/incoming")`, "stop()"],
      description: "Forward all incoming emails to our API",
    });
  } catch (error) {
    console.error("Error setting up Mailgun routes:", error);
  }
}
