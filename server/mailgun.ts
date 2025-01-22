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

    if (!domains || !domains.items) {
      console.error("Error: Unable to fetch domains from Mailgun. Response:", domains);
      return;
    }

    console.log(`Found ${domains.items.length} domains in Mailgun account`);

    const domain = domains.items.find(d => d.name === process.env.MAILGUN_DOMAIN);

    if (!domain) {
      console.error(`Domain ${process.env.MAILGUN_DOMAIN} not found in Mailgun account.
Please add this domain in your Mailgun dashboard:
1. Go to Sending → Domains
2. Click "Add New Domain"
3. Enter your domain name
4. Follow the DNS setup instructions`);
      return;
    }

    console.log("Domain found, checking DNS records...");

    // Check DNS records verification status
    const dnsRecords = await mg.domains.getDomainRecords(process.env.MAILGUN_DOMAIN!);
    console.log("DNS Records:", JSON.stringify(dnsRecords, null, 2));

    const unverifiedRecords = dnsRecords.receiving_dns_records.filter(record => !record.valid) || [];

    if (unverifiedRecords.length > 0) {
      console.error(`
Domain found but has unverified DNS records. Please add these DNS records:
${unverifiedRecords.map(record => `
Type: ${record.record_type}
Name: ${record.name}
Value: ${record.value}
`).join('\n')}
      `);
      return;
    }

    if (!domain.isVerified) {
      console.error(`Domain ${process.env.MAILGUN_DOMAIN} exists but is not verified.
Please verify your domain in the Mailgun dashboard:
1. Go to Sending → Domains
2. Click on your domain
3. Check the "Domain Verification & DNS" section
4. Add any missing DNS records`);
      return;
    }

    console.log("Domain is verified, setting up email routes...");

    // Then set up the routes if domain is verified
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

    if (!routes || !routes.items) {
      console.error("Error: Unable to fetch routes from Mailgun. Response:", routes);
      return;
    }

    console.log(`Found ${routes.items.length} existing routes`);

    const existingRoute = routes.items.find(route => 
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
        description: "Forward incoming emails to API endpoint",
        priority: 10
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