import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["Office365EnvValidation"] });

interface EnvironmentConfig {
  NEXT_PUBLIC_WEBAPP_URL?: string;
  MICROSOFT_WEBHOOK_URL?: string;
  MICROSOFT_WEBHOOK_TOKEN?: string;
}

interface ValidationResult {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
}

/**
 * Validates required environment variables for Office365 calendar integration
 */
export function validateOffice365Environment(): ValidationResult {
  const env = process.env as EnvironmentConfig;
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Either MICROSOFT_WEBHOOK_URL or NEXT_PUBLIC_WEBAPP_URL is required for webhook URL
  if (!env.MICROSOFT_WEBHOOK_URL && !env.NEXT_PUBLIC_WEBAPP_URL) {
    missingVars.push("MICROSOFT_WEBHOOK_URL or NEXT_PUBLIC_WEBAPP_URL");
  }

  // Optional but recommended environment variables
  const recommendedVars = ["MICROSOFT_WEBHOOK_TOKEN"];

  // No need to check individual required variables since we check the combination above

  // Check recommended variables
  for (const varName of recommendedVars) {
    if (!env[varName as keyof EnvironmentConfig]) {
      warnings.push(
        `Recommended environment variable ${varName} is not set. Webhook validation may not work properly.`
      );
    }
  }

  // Validate NEXT_PUBLIC_WEBAPP_URL format
  if (env.NEXT_PUBLIC_WEBAPP_URL) {
    try {
      new URL(env.NEXT_PUBLIC_WEBAPP_URL);
    } catch (error) {
      missingVars.push("NEXT_PUBLIC_WEBAPP_URL (invalid URL format)");
    }
  }

  // Validate webhook URL if provided
  if (env.MICROSOFT_WEBHOOK_URL) {
    try {
      new URL(env.MICROSOFT_WEBHOOK_URL);
    } catch (error) {
      warnings.push("MICROSOFT_WEBHOOK_URL has invalid URL format");
    }
  }

  const isValid = missingVars.length === 0;

  if (!isValid) {
    log.error("Office365 environment validation failed", {
      missingVars,
      warnings,
    });
  } else if (warnings.length > 0) {
    log.warn("Office365 environment validation passed with warnings", {
      warnings,
    });
  } else {
    log.info("Office365 environment validation passed");
  }

  return {
    isValid,
    missingVars,
    warnings,
  };
}

/**
 * Gets the webhook URL with fallback logic
 */
export function getWebhookUrl(): string {
  // eslint-disable-next-line turbo/no-undeclared-env-vars -- MICROSOFT_WEBHOOK_URL only for local testing
  const baseUrl = process.env.MICROSOFT_WEBHOOK_URL || process.env.NEXT_PUBLIC_WEBAPP_URL;

  if (!baseUrl) {
    throw new Error("Neither MICROSOFT_WEBHOOK_URL nor NEXT_PUBLIC_WEBAPP_URL is configured");
  }

  // Ensure baseUrl doesn't end with slash to prevent double slashes
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/api/integrations/office365calendar/webhook`;
}

/**
 * Gets the webhook token with validation
 */
export function getWebhookToken(): string | undefined {
  const token = process.env.MICROSOFT_WEBHOOK_TOKEN;

  if (!token) {
    log.warn("MICROSOFT_WEBHOOK_TOKEN is not configured. Webhook validation will be disabled.");
  }

  return token;
}
