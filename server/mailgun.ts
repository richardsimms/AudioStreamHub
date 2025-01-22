import formData from "form-data";
import Mailgun from "mailgun.js";
import type { Mailgun as MailgunClient } from "mailgun.js";

let mg: MailgunClient;

export function setupMailgun() {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.error("Mailgun API key or domain not set");
    return;
  }

  const mailgun = new Mailgun(formData);
  mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY,
  });

  // Verify domain and routes setup
  verifyDomainSetup().catch(console.error);
}

async function verifyDomainSetup() {
  try {
    // First verify the domain exists and is configured
    const domains = await mg.domains.list();
    const domain = domains.items.find(d => d.name === process.env.MAILGUN_DOMAIN);

    if (!domain) {
      console.error("Domain not found in Mailgun account. Please verify domain setup.");
      return;
    }

    if (!domain.isVerified) {
      console.error("Domain not verified. Please verify domain in Mailgun dashboard.");
      return;
    }

    // Then set up the routes
    await setupEmailRoutes();

    console.log("Mailgun configuration completed successfully");
  } catch (error) {
    console.error("Error verifying Mailgun setup:", error);
  }
}

async function setupEmailRoutes() {
  try {
    const routes = await mg.routes.list();
    const existingRoute = routes.items.find(route => 
      route.expression.includes(process.env.MAILGUN_DOMAIN!)
    );

    if (!existingRoute) {
      await mg.routes.create({
        expression: `match_recipient(".*@${process.env.MAILGUN_DOMAIN}")`,
        action: [
          `forward("${process.env.APP_URL || 'http://localhost:5000'}/api/email/incoming")`,
          "store()",
          "stop()"
        ],
        description: "Forward incoming emails to API endpoint",
      });
      console.log("Created new Mailgun route for email forwarding");
    } else {
      console.log("Existing Mailgun route found");
    }
  } catch (error) {
    console.error("Error managing Mailgun routes:", error);
  }
}

export async function generateForwardingEmail(userId: number): Promise<string> {
  const timestamp = Date.now();
  return `user.${userId}.${timestamp}@${process.env.MAILGUN_DOMAIN}`;
}

export async function validateEmail(email: string): Promise<boolean> {
  try {
    const validation = await mg.validate.get(email);
    return validation.is_valid;
  } catch (error) {
    console.error("Error validating email:", error);
    return false;
  }
}