import { ValidatorConstraint } from "class-validator";
import type { ValidatorConstraintInterface } from "class-validator";

import { validateUrlForSSRFSync } from "@calcom/platform-libraries";

/**
 * Validates that a webhook URL is safe for server-side requests
 *
 * Allows: HTTPS URLs to public hosts
 * Blocks: HTTP, private IPs, metadata endpoints, non-HTTPS schemes
 */
@ValidatorConstraint({ name: "webhookSafeUrl", async: false })
export class WebhookUrlValidator implements ValidatorConstraintInterface {
  validate(url: string): boolean {
    if (!url) return true;

    const result = validateUrlForSSRFSync(url);
    return result.isValid;
  }

  defaultMessage(): string {
    return "Webhook URL is not allowed: only HTTPS URLs to public hosts are permitted";
  }
}
