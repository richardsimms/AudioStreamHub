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

    // Find speasy.app domain
    const customDomain = domainsList.find(d => d.name === 'speasy.app');
    if (!customDomain) {
      console.error("speasy.app domain not found in Mailgun account");
      return;
    }

    console.log("Using custom domain:", customDomain.name);
    process.env.MAILGUN_DOMAIN = customDomain.name;

    // Get domain info and verify receiving records
    const domainInfo = await mg.domains.get(customDomain.name);
    console.log("Domain Info:", JSON.stringify(domainInfo, null, 2));

    // Wait for domain to be ready (retry a few times)
    let retries = 3;
    while (retries > 0) {
      if (domainInfo.state === 'active' && domainInfo.receiving_dns_records?.every((record: any) => record.valid === 'valid')) {
        console.log("Domain is properly configured and ready to receive emails");
        break;
      }
      console.log(`Domain not ready yet. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      retries--;
    }

    // Set up routes only if domain is properly configured
    if (domainInfo.state === 'active') {
      console.log("Setting up email routes...");
      await setupEmailRoutes();
      console.log("Mailgun configuration completed successfully");
    } else {
      console.error("Domain setup incomplete. Please verify DNS records.");
    }
  } catch (error) {
    console.error("Error verifying Mailgun setup:", error);
    throw error;
  }
}

async function setupEmailRoutes() {
  try {
    console.log("Fetching existing Mailgun routes...");
    const routes = await mg.routes.list();
    console.log("Routes response:", JSON.stringify(routes, null, 2));

    const routesList = Array.isArray(routes) ? routes : routes.items || [];
    console.log(`Found ${routesList.length} existing routes`);

    // Delete existing routes to ensure clean setup
    for (const route of routesList) {
      console.log(`Deleting route: ${route.id}`);
      await mg.routes.destroy(route.id);
    }

    const webhookUrl = process.env.REPL_SLUG ? 
      `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` :
      "https://speasy.app";

    const emailEndpoint = `${webhookUrl}/api/email/incoming`;
    console.log("Configuring route with webhook URL:", emailEndpoint);

    // Create route configuration with domain-specific expression
    const routeConfig = {
      expression: `match_recipient(".*@${process.env.MAILGUN_DOMAIN}")`,
      action: [
        `forward("${emailEndpoint}")`,
        'store()',
        'stop()'
      ],
      description: "Forward incoming emails to our API",
      priority: 0
    };

    console.log("Creating new route with configuration:", JSON.stringify(routeConfig, null, 2));
    const newRoute = await mg.routes.create(routeConfig);
    console.log("Successfully created route:", JSON.stringify(newRoute, null, 2));

  } catch (error) {
    console.error("Error managing Mailgun routes:", error);
    throw error;
  }
}

export async function generateForwardingEmail(_userId: number): Promise<string> {
  const randomString = Math.random().toString(36).substring(2, 15);
  const email = `${randomString}@${process.env.MAILGUN_DOMAIN}`;
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