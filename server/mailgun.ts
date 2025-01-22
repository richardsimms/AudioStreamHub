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
    url: 'https://api.mailgun.net',
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

    // Handle domains being directly in the response
    const domainsList = Array.isArray(domains) ? domains : domains.items || [];
    console.log(`Found ${domainsList.length} domains in Mailgun account`);

    const domain = domainsList.find(d => d.name === process.env.MAILGUN_DOMAIN);

    if (!domain) {
      console.error(`Domain ${process.env.MAILGUN_DOMAIN} not found in Mailgun account`);
      return;
    }

    console.log("Domain found:", JSON.stringify(domain, null, 2));

    // Since we can't directly fetch DNS records through the API,
    // provide instructions for manual DNS setup
    console.log(`
Please verify these DNS records are set for your domain:
1. SPF Record (TXT):
   - Name: @
   - Value: v=spf1 include:mailgun.org ~all

2. DKIM Record (TXT):
   - Name: k1._domainkey.${process.env.MAILGUN_DOMAIN}
   - Value: Check Mailgun dashboard for value

3. MX Records:
   - Name: @
   - Value: mxa.mailgun.org (Priority 10)
   - Value: mxb.mailgun.org (Priority 10)
    `);

    console.log("Setting up email routes...");
    await setupEmailRoutes();
  } catch (error) {
    console.error("Error verifying Mailgun setup:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

async function setupEmailRoutes() {
  try {
    // Ensure we have a valid webhook URL
    if (!process.env.PUBLIC_WEBHOOK_URL) {
      throw new Error("PUBLIC_WEBHOOK_URL environment variable is not set");
    }

    const webhookUrl = new URL('/api/email/incoming', process.env.PUBLIC_WEBHOOK_URL).toString();
    console.log("Using webhook URL:", webhookUrl);

    console.log("Fetching existing Mailgun routes...");
    const routes = await mg.routes.list();
    console.log("Routes response:", JSON.stringify(routes, null, 2));

    const routesList = Array.isArray(routes) ? routes : routes.items || [];
    console.log(`Found ${routesList.length} existing routes`);

    // Delete any existing routes for our domain
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
        "store()",
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

    if ((error as any)?.details?.includes('must be publicly accessible')) {
      console.error(`
Error: Webhook URL must be publicly accessible.
Please make sure your PUBLIC_WEBHOOK_URL environment variable points to a publicly accessible URL.
`);
    }

    throw error; // Re-throw to be caught by the caller
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