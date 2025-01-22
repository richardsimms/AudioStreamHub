import FormData from "form-data";
import Mailgun from "mailgun.js";
import type { Mailgun as MailgunClient } from "mailgun.js";

let mg: MailgunClient;

export function setupMailgun() {
  console.log("Starting Mailgun setup...");

  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.error("Mailgun configuration error: MAILGUN_API_KEY or MAILGUN_DOMAIN environment variables are not set");
    return;
  }

  console.log(`Attempting to configure Mailgun for domain: ${process.env.MAILGUN_DOMAIN}`);

  const mailgun = new Mailgun(FormData);
  mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
  });

  // Verify domain and routes setup
  verifyDomainSetup().catch(error => {
    console.error("Failed to verify Mailgun domain setup:", error);
  });
}

async function verifyDomainSetup() {
  try {
    console.log("Fetching Mailgun domains...");
    const domains = await mg.domains.list();
    console.log("Domains response:", JSON.stringify(domains, null, 2));

    if (!domains) {
      console.error("Error: No domains response from Mailgun");
      return;
    }

    const domainsList = Array.isArray(domains) ? domains : domains.items || [];
    console.log(`Found ${domainsList.length} domains in Mailgun account`);

    const domain = domainsList.find(d => d.name === process.env.MAILGUN_DOMAIN);
    if (!domain) {
      console.error(`Domain ${process.env.MAILGUN_DOMAIN} not found in Mailgun account`);
      return;
    }

    console.log("Domain found:", JSON.stringify(domain, null, 2));

    // Check domain verification status
    if (domain.state !== 'active') {
      console.error(`Domain ${process.env.MAILGUN_DOMAIN} is not active. Current state: ${domain.state}`);
      console.error("Please verify your domain in the Mailgun dashboard");
      return;
    }

    // Try to get domain credentials
    try {
      const credentials = await mg.domains.getCredentials(process.env.MAILGUN_DOMAIN!);
      console.log("Domain credentials retrieved successfully");
    } catch (error) {
      console.error("Error retrieving domain credentials:", error);
      console.error("This might indicate insufficient permissions or incomplete domain setup");
      return;
    }

    console.log("Setting up email routes...");
    await setupEmailRoutes();
    console.log("Mailgun configuration completed");
  } catch (error) {
    console.error("Error verifying Mailgun setup:", error);
    throw error;
  }
}

async function setupEmailRoutes() {
  try {
    if (!process.env.PUBLIC_WEBHOOK_URL) {
      throw new Error("PUBLIC_WEBHOOK_URL environment variable is not set");
    }

    const webhookBaseUrl = "https://7618ae55-dcd1-4178-8a15-04009091ee27-00-q5sdxm13xgps.riker.replit.dev";
    const webhookUrl = `${webhookBaseUrl}/api/email/incoming`;
    console.log("Using webhook URL:", webhookUrl);

    console.log("Fetching existing Mailgun routes...");
    const routes = await mg.routes.list();
    console.log("Routes response:", JSON.stringify(routes, null, 2));

    const routesList = Array.isArray(routes) ? routes : routes.items || [];
    console.log(`Found ${routesList.length} existing routes`);

    // Delete existing routes for our domain
    for (const route of routesList) {
      if (route.expression.includes(process.env.MAILGUN_DOMAIN!)) {
        console.log(`Deleting existing route: ${route.id}`);
        await mg.routes.destroy(route.id);
      }
    }

    console.log("Creating new route for email forwarding...");
    const routeConfig = {
      expression: `match_recipient(".*@${process.env.MAILGUN_DOMAIN}")`,
      action: [
        `forward("${webhookUrl}")`,
        "store()",  // Store the message for potential debugging
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
  // Use a subdomain-based approach for better deliverability
  const timestamp = Date.now();
  return `user-${userId}-${timestamp}@${process.env.MAILGUN_DOMAIN}`;
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