import FormData from "form-data";
import Mailgun from "mailgun.js";
import type { Mailgun as MailgunClient } from "mailgun.js";

let mg: MailgunClient;

export function setupMailgun() {
  console.log("Starting Mailgun setup...");

  if (!process.env.MAILGUN_API_KEY) {
    console.error("Mailgun configuration error: MAILGUN_API_KEY environment variable is not set");
    return;
  }

  const mailgun = new Mailgun(FormData);
  mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
  });

  // Verify domain and routes setup
  verifyDomainSetup().catch(error => {
    console.error("Failed to verify Mailgun setup:", error);
  });
}

async function verifyDomainSetup() {
  try {
    console.log("Fetching Mailgun domains...");
    const domains = await mg.domains.list();
    console.log("Domains response:", JSON.stringify(domains, null, 2));

    const domainsList = Array.isArray(domains) ? domains : domains.items || [];
    console.log(`Found ${domainsList.length} domains in Mailgun account`);

    // Find sandbox domain
    const sandboxDomain = domainsList.find(d => d.type === 'sandbox');
    if (!sandboxDomain) {
      console.error("No sandbox domain found in Mailgun account");
      return;
    }

    console.log("Using sandbox domain:", sandboxDomain.name);
    process.env.MAILGUN_DOMAIN = sandboxDomain.name;

    // For sandbox domains, we need to authorize recipients
    await authorizeTestRecipient();

    console.log("Setting up email routes...");
    await setupEmailRoutes();
    console.log("Mailgun configuration completed successfully");
  } catch (error) {
    console.error("Error verifying Mailgun setup:", error);
    throw error;
  }
}

async function authorizeTestRecipient() {
  try {
    const testEmail = `user-999@${process.env.MAILGUN_DOMAIN}`;
    console.log(`Authorizing test recipient: ${testEmail}`);

    // Add the test email as an authorized recipient using POST request
    const response = await fetch(`https://api.mailgun.net/v3/domains/${process.env.MAILGUN_DOMAIN}/credentials`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        login: testEmail,
        password: 'test123' // This password isn't used since we're forwarding emails
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to authorize recipient: ${response.status} ${response.statusText}`);
    }

    console.log("Successfully authorized test recipient");
  } catch (error) {
    console.error("Error authorizing test recipient:", error);
    // Continue even if authorization fails, as the recipient might already be authorized
  }
}

async function setupEmailRoutes() {
  try {
    if (!process.env.PUBLIC_WEBHOOK_URL) {
      throw new Error("PUBLIC_WEBHOOK_URL environment variable is not set");
    }

    console.log("Fetching existing Mailgun routes...");
    const routes = await mg.routes.list();
    console.log("Routes response:", JSON.stringify(routes, null, 2));

    const routesList = Array.isArray(routes) ? routes : routes.items || [];
    console.log(`Found ${routesList.length} existing routes`);

    // Delete ALL existing routes
    for (const route of routesList) {
      console.log(`Deleting route: ${route.id}`);
      await mg.routes.destroy(route.id);
    }

    const webhookBaseUrl = process.env.PUBLIC_WEBHOOK_URL;
    const webhookUrl = `${webhookBaseUrl}/api/email/incoming`;
    console.log("Using webhook URL:", webhookUrl);

    console.log("Creating new route for email forwarding...");
    const routeConfig = {
      expression: `match_recipient(".*@${process.env.MAILGUN_DOMAIN}")`,
      action: [
        `forward("${webhookUrl}")`,
        "stop()"
      ],
      description: "Forward all incoming emails to our API",
      priority: 0
    };

    console.log("Route configuration:", JSON.stringify(routeConfig, null, 2));
    const newRoute = await mg.routes.create(routeConfig);
    console.log("Successfully created new route:", JSON.stringify(newRoute, null, 2));

  } catch (error) {
    console.error("Error managing Mailgun routes:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

export async function generateForwardingEmail(userId: number): Promise<string> {
  const email = `user-${userId}@${process.env.MAILGUN_DOMAIN}`;
  console.log(`Generated forwarding email: ${email}`);
  return email;
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