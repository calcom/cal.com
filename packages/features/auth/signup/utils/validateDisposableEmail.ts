import { isDisposable } from "disposable-email-domains-js";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["validateDisposableEmail"] });

/**
 * Known email relay/forwarding services that should be blocked.
 * Apple's Hide My Email (privaterelay.appleid.com, icloud.com) is explicitly allowed.
 *
 * Note: We only block relay-specific domains, not legitimate email providers.
 * For example, we don't block proton.me or fastmail.com as those are primary mailbox domains.
 */
const BLOCKED_RELAY_DOMAINS = [
  // DuckDuckGo Email Protection
  "duck.com",
  // Firefox Relay
  "relay.firefox.com",
  "mozmail.com",
  // SimpleLogin
  "simplelogin.com",
  "simplelogin.co",
  "aleeas.com",
  "slmail.me",
  // AnonAddy / Addy.io
  "anonaddy.com",
  "anonaddy.me",
  "addy.io",
  // 33mail
  "33mail.com",
  // Blur by Abine
  "opayq.com",
  // Burner Mail
  "burnermail.io",
  // Forward Email
  "forwardemail.net",
  // ImprovMX
  "improvmx.com",
  // Mailsac
  "mailsac.com",
];

/**
 * Apple relay domains that are explicitly allowed
 */
const ALLOWED_RELAY_DOMAINS = ["privaterelay.appleid.com", "icloud.com"];

interface DisposableEmailCheckResult {
  isDisposable: boolean;
  isBlockedRelay: boolean;
  reason?: string;
}

/**
 * Extracts the domain from an email address
 */
function extractDomain(email: string): string {
  const parts = email.toLowerCase().split("@");
  return parts[1] || "";
}

/**
 * Checks if the email domain is a blocked relay service
 */
function isBlockedRelayDomain(domain: string): boolean {
  // First check if it's an allowed relay (Apple)
  if (ALLOWED_RELAY_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))) {
    return false;
  }

  // Then check if it's a blocked relay
  return BLOCKED_RELAY_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

/**
 * Checks if an email is from a disposable email provider using the disposable-email-domains-js npm package.
 * This is a local check with no external API calls - the package contains 100k+ known disposable domains.
 */
function checkDisposableWithLocalList(email: string): boolean {
  try {
    return isDisposable(email);
  } catch (error) {
    log.warn("Failed to check disposable email with local list", { error });
    return false;
  }
}

/**
 * Validates an email address against disposable email providers and blocked relay services.
 *
 * This function:
 * 1. Checks if the email domain is a known blocked relay service (except Apple)
 * 2. Checks if the email is from a disposable/throwaway email provider using local domain list
 *
 * @param email - The email address to validate
 * @returns Object containing validation results
 */
export async function validateDisposableEmail(email: string): Promise<DisposableEmailCheckResult> {
  const domain = extractDomain(email);

  if (!domain) {
    return {
      isDisposable: false,
      isBlockedRelay: false,
    };
  }

  // Check for blocked relay domains first (local check, fast)
  if (isBlockedRelayDomain(domain)) {
    log.info("Blocked relay email domain detected", { domain });
    return {
      isDisposable: false,
      isBlockedRelay: true,
      reason: "Email relay services are not allowed for signup",
    };
  }

  // Check for disposable emails using local domain list (no external API)
  const disposable = checkDisposableWithLocalList(email);

  if (disposable) {
    log.info("Disposable email detected", { domain });
    return {
      isDisposable: true,
      isBlockedRelay: false,
      reason: "Disposable email addresses are not allowed for signup",
    };
  }

  return {
    isDisposable: false,
    isBlockedRelay: false,
  };
}

/**
 * Simple check that returns true if the email should be blocked
 */
export async function isDisposableOrBlockedRelayEmail(email: string): Promise<boolean> {
  const result = await validateDisposableEmail(email);
  return result.isDisposable || result.isBlockedRelay;
}
