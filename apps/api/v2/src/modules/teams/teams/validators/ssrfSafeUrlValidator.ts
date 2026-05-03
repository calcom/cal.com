import { validateUrlForSSRFSync } from "@calcom/platform-libraries";
import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

/**
 * Validates that a URL is safe for server-side fetching
 *
 * Allows: HTTPS URLs, image data URLs
 * Blocks: HTTP, private IPs, metadata endpoints, unsafe schemes
 */
@ValidatorConstraint({ name: "ssrfSafeUrl", async: false })
export class SSRFSafeUrlValidator implements ValidatorConstraintInterface {
  validate(url: string): boolean {
    // Allow null/undefined (handled by @IsOptional), but not empty strings
    if (url === undefined || url === null) return true;

    const result = validateUrlForSSRFSync(url);
    return result.isValid;
  }

  defaultMessage(): string {
    return "URL is not allowed for security reasons (blocked: private IPs, metadata endpoints)";
  }
}
