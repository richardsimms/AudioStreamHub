import formData from "form-data";
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

  const mailgun = new Mailgun(formData);
  mg = mailgun.client({
    username: "api",
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

    // Handle domains being directly in the response
    const domainsList = Array.isArray(domains) ? domains : domains.items || [];
    console.log(`Found ${domainsList.length} domains in Mailgun account`);

    const domain = domainsList.find(d => d.name === process.env.MAILGUN_DOMAIN);

    if (!domain) {
      console.error(`Domain ${process.env.MAILGUN_DOMAIN} not found in Mailgun account.
Please add this domain in your Mailgun dashboard:
1. Go to Sending → Domains
2. Click "Add New Domain"
3. Enter your domain name
4. Follow the DNS setup instructions`);
      return;
    }

    console.log("Domain found:", JSON.stringify(domain, null, 2));
    console.log("Setting up email routes...");
    await setupEmailRoutes();
    console.log("Mailgun configuration completed successfully");
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
    console.log("Fetching existing Mailgun routes...");
    const routes = await mg.routes.list();
    console.log("Routes response:", JSON.stringify(routes, null, 2));

    const routesList = Array.isArray(routes) ? routes : routes.items || [];
    console.log(`Found ${routesList.length} existing routes`);

    const existingRoute = routesList.find(route => 
      route.expression.includes(process.env.MAILGUN_DOMAIN!)
    );

    if (!existingRoute) {
      console.log("Creating new route for email forwarding...");
      const routeConfig = {
        expression: `match_recipient(".*@${process.env.MAILGUN_DOMAIN}")`,
        action: [
          `forward("${process.env.APP_URL || 'http://localhost:5000'}/api/email/incoming")`,
          "store()",
          "stop()"
        ],
        description: "Forward all incoming emails to our API",
        priority: 0
      };

      console.log("Route configuration:", JSON.stringify(routeConfig, null, 2));

      await mg.routes.create(routeConfig);
      console.log("Successfully created new Mailgun route for email forwarding");
    } else {
      console.log("Existing Mailgun route found:", JSON.stringify(existingRoute, null, 2));
    }
  } catch (error) {
    console.error("Error managing Mailgun routes:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
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