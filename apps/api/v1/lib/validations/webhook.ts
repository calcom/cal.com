import { isIP } from "net";
import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import { _WebhookModel as Webhook } from "@calcom/prisma/zod";
import ipRangeCheck from "ip-range-check";

// Security: Whitelist of allowed URL schemes and patterns
const ALLOWED_URL_SCHEMES = ["https:", "http:"];
// Private IP ranges according to RFC 1918 and RFC 4193
const BLOCKED_IP_RANGES = [
  "127.0.0.0/8", // Loopback
  "10.0.0.0/8", // Private
  "172.16.0.0/12", // Private
  "192.168.0.0/16", // Private
  "169.254.0.0/16", // Link-local
  "fc00::/7", // Unique local
  "fe80::/10", // Link-local
];

// Custom URL validator with security checks
const secureUrlValidator = z.string().refine(
  (url) => {
    try {
      const parsedUrl = new URL(url);

      // Check if scheme is allowed
      if (!ALLOWED_URL_SCHEMES.includes(parsedUrl.protocol)) {
        return false;
      }

      const hostname = parsedUrl.hostname.toLowerCase();

      // Block localhost explicitly
      if (hostname === "localhost") {
        return false;
      }

      // Check if the hostname is an IP address and if it falls into a blocked range.
      if (isIP(hostname) && ipRangeCheck(hostname, BLOCKED_IP_RANGES)) {
        return false;
      }

      // Additional security checks
      if (parsedUrl.username || parsedUrl.password) {
        return false; // No credentials in URL
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [/javascript:/i, /data:/i, /vbscript:/i, /file:/i];

      if (suspiciousPatterns.some((pattern) => pattern.test(url))) {
        return false;
      }

      return true;
    } catch {
      return false; // Invalid URL format
    }
  },
  {
    message: "Invalid or unsafe webhook URL. Only HTTPS/HTTP URLs to public domains are allowed.",
  }
);

const schemaWebhookBaseBodyParams = Webhook.pick({
  userId: true,
  eventTypeId: true,
  eventTriggers: true,
  active: true,
  subscriberUrl: true,
  payloadTemplate: true,
});

export const schemaWebhookCreateParams = z
  .object({
    subscriberUrl: secureUrlValidator,
    eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array(),
    active: z.boolean(),
    payloadTemplate: z.string().optional().nullable(),
    eventTypeId: z.number().optional(),
    userId: z.number().optional(),
    secret: z.string().optional().nullable(),
    // API shouldn't mess with Apps webhooks yet (ie. Zapier)
    // appId: z.string().optional().nullable(),
  })
  .strict();

export const schemaWebhookCreateBodyParams = schemaWebhookBaseBodyParams.merge(schemaWebhookCreateParams);

export const schemaWebhookEditBodyParams = schemaWebhookBaseBodyParams
  .merge(
    z.object({
      subscriberUrl: secureUrlValidator.optional(),
      eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
      secret: z.string().optional().nullable(),
    })
  )
  .partial()
  .strict();

export const schemaWebhookReadPublic = Webhook.pick({
  id: true,
  userId: true,
  eventTypeId: true,
  payloadTemplate: true,
  eventTriggers: true,
  subscriberUrl: true,
  // eventType: true,
  // app: true,
  appId: true,
});
