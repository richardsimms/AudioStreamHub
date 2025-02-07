import { convert } from "html-to-text";
import FormData from "form-data";
import Mailgun from "mailgun.js";
let mg: Mailgun;
export function setupMailgun() {
  console.log("Starting Mailgun setup...");
  if (!process.env.MAILGUN_API_KEY) {
    console.error(
      "Mailgun configuration error: MAILGUN_API_KEY environment variable is not set",
    );
    return;
  }
  const mailgun = new Mailgun(FormData);
  mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY,
  });
  // Verify domain and routes setup
  verifyDomainSetup().catch((error) => {
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
    const customDomain = domainsList.find((d) => d.name === "speasy.app");
    if (!customDomain) {
      console.error("speasy.app domain not found in Mailgun account");
      return;
    }
    console.log("Using custom domain:", customDomain.name);
    process.env.MAILGUN_DOMAIN = customDomain.name;
    // Get domain info and verify receiving records
    const domainInfo = await mg.domains.get(customDomain.name);
    console.log("Domain Info:", JSON.stringify(domainInfo, null, 2));
    // Verify receiving DNS records
    const receivingValid = (domainInfo.receiving_dns_records || []).every(
      (record: any) => record.valid === "valid",
    );
    const sendingValid = (domainInfo.sending_dns_records || []).every(
      (record: any) => record.valid === "valid",
    );
    if (domainInfo.state === "active" && receivingValid && sendingValid) {
      console.log("Domain is properly configured");
      await setupEmailRoutes();
    } else {
      console.error("Domain setup incomplete");
    }
  } catch (error) {
    console.error("Error verifying Mailgun setup:", error);
    throw error;
  }
}
async function setupEmailRoutes() {
  try {
    console.log("Setting up email routes...");
    const routes = await mg.routes.list();
    const routesList = Array.isArray(routes) ? routes : routes.items || [];
    // Delete existing routes
    for (const route of routesList) {
      await mg.routes.destroy(route.id);
    }
    const webhookUrl = process.env.REPLIT_URL || "https://speasy-mail.replit.app";
    const emailEndpoint = `${webhookUrl}/api/email/incoming`;
    // Create new route
    const routeConfig = {
      expression: `match_recipient(".*@${process.env.MAILGUN_DOMAIN}")`,
      action: [
        "store()",
        `forward("${emailEndpoint}")`,
        "stop()",
      ],
      description: "Forward incoming emails to API",
      priority: 0,
    };
    const newRoute = await mg.routes.create(routeConfig);
    console.log("Route created:", JSON.stringify(newRoute, null, 2));
  } catch (error) {
    console.error("Error managing routes:", error);
    throw error;
  }
}
export async function processVerificationLink(content: string): Promise<{ success: boolean; message: string; link?: string }> {
  try {
    if (!content) {
      throw new Error('Invalid content provided');
    }
    const plainText = convert(content, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: false } }
      ]
    });
    const patterns = [
      /https?:\/\/[^\s<>"]+?(?:confirm|verify|subscription|activate)[^\s<>"]+/i,
      /https?:\/\/substack\.com\/[^\s<>"]+/i,
      /https?:\/\/cdn\.substack\.com\/[^\s<>"]+/i
    ];
    for (const pattern of patterns) {
      const match = plainText.match(pattern);
      if (match) {
        try {
          const response = await fetch(match[0], {
            method: 'GET',
            redirect: 'follow',
            headers: {
              'User-Agent': 'Speasy-Verification/1.0'
            }
          });
          if (response.ok) {
            console.log('Successfully verified subscription');
            return {
              success: true,
              message: 'Verification link processed successfully',
              link: match[0]
            };
          }
        } catch (error) {
          console.error('Error accessing verification link:', error);
          throw new Error(`Failed to access verification link: ${error.message}`);
        }
      }
    }
    return {
      success: false,
      message: 'No verification link found in content'
    };
  } catch (error) {
    console.error('Error processing verification link:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
export async function generateForwardingEmail(
  _userId: number,
): Promise<string> {
  if (!process.env.MAILGUN_DOMAIN) {
    throw new Error("Mailgun domain not configured");
  }
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