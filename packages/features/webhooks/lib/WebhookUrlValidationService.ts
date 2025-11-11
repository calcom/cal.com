/**
 * Webhook URL Validation Service
 *
 * Service class for validating webhook URLs with SSRF protection.
 * Provides both synchronous (client-safe) and asynchronous (with DNS resolution) validation.
 *
 * @module WebhookUrlValidationService
 */

import { URL } from "url";
import { ipValidationService, IPValidationService } from "@calcom/lib/IPValidationService";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[WebhookURLValidationService]"] });

/**
 * Service for validating webhook URLs with comprehensive SSRF protection
 */
export class WebhookUrlValidationService {
    private ipValidator: IPValidationService;

    /**
     * Constructor with optional dependency injection for IP validation
     *
     * @param ipValidator - Optional IPValidationService instance for testing
     */
    constructor(ipValidator?: IPValidationService) {
        this.ipValidator = ipValidator || ipValidationService;
    }

    /**
     * Check if localhost and private IPs should be allowed based on environment
     * This function is called at runtime to respect environment changes in tests
     */
    private shouldAllowLocalhost(): boolean {
        return (
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "test" ||
            process.env.ALLOW_LOCALHOST_WEBHOOKS === "true"
        );
    }

    /**
     * Checks if a string is an IPv4 address
     */
    private isIPv4(hostname: string): boolean {
        return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    }

    /**
     * Checks if a string is an IPv6 address
     */
    private isIPv6(hostname: string): boolean {
        const clean = hostname.replace(/^\[|\]$/g, "");
        return clean.includes(":");
    }

    /**
     * Validates a webhook URL synchronously (for use in Zod schemas and client-side code)
     *
     * This function performs basic validation without DNS resolution:
     * - Protocol validation (http/https only)
     * - Localhost detection
     * - Direct IP address validation (both IPv4 and IPv6)
     *
     * Note: This cannot detect domains that resolve to private IPs.
     * Server-side code should use validateAsync() for complete protection.
     *
     * @param urlString - URL to validate
     * @returns true if URL passes basic validation, false otherwise
     */
    validateSync(urlString: string): boolean {
        const allowLocalhost = this.shouldAllowLocalhost();

        try {
            const parsedUrl = new URL(urlString);

            // Only allow HTTP and HTTPS protocols
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                log.debug("Blocked non-HTTP(S) protocol", { url: urlString, protocol: parsedUrl.protocol });
                return false;
            }

            const hostname = parsedUrl.hostname;

            // Check for localhost (respect environment)
            if (this.ipValidator.isLocalHost(hostname)) {
                if (allowLocalhost) {
                    log.debug("Allowing localhost in development/test", { url: urlString, env: process.env.NODE_ENV });
                    return true;
                } else {
                    log.debug("Blocked localhost in production", { url: urlString });
                    return false;
                }
            }

            // Check if hostname is an IPv4 address
            if (this.isIPv4(hostname)) {
                if (this.ipValidator.isPrivateOrReservedIPv4(hostname)) {
                    if (allowLocalhost) {
                        log.debug("Allowing private IPv4 in development/test", {
                            url: urlString,
                            ip: hostname,
                            env: process.env.NODE_ENV,
                        });
                        return true;
                    } else {
                        log.debug("Blocked private IPv4 in production", { url: urlString, ip: hostname });
                        return false;
                    }
                }
            }

            // Check if hostname is an IPv6 address
            if (this.isIPv6(hostname)) {
                if (this.ipValidator.isPrivateOrReservedIPv6(hostname)) {
                    if (allowLocalhost) {
                        log.debug("Allowing private IPv6 in development/test", {
                            url: urlString,
                            ip: hostname,
                            env: process.env.NODE_ENV,
                        });
                        return true;
                    } else {
                        log.debug("Blocked private IPv6 in production", { url: urlString, ip: hostname });
                        return false;
                    }
                }
            }

            // Basic validation passed
            return true;
        } catch (error) {
            log.warn("Invalid URL format", { url: urlString, error });
            return false;
        }
    }

    /**
     * Validates a webhook URL asynchronously with DNS resolution (server-side only)
     *
     * This function performs comprehensive validation:
     * - Protocol validation (http/https only)
     * - Localhost detection
     * - Direct IP address validation (both IPv4 and IPv6)
     * - DNS resolution to detect domains resolving to private IPs
     *
     * This provides complete SSRF protection by resolving domain names and checking
     * if they point to private or reserved IP addresses.
     *
     * @param urlString - URL to validate
     * @throws Error if URL is invalid or resolves to a private/reserved IP
     */
    async validateAsync(urlString: string): Promise<void> {
        const allowLocalhost = this.shouldAllowLocalhost();

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(urlString);
        } catch (error) {
            log.warn("Invalid URL format", { url: urlString, error });
            throw new Error("Invalid URL format");
        }

        // Only allow HTTP and HTTPS protocols
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            log.warn("Blocked non-HTTP(S) protocol", { url: urlString, protocol: parsedUrl.protocol });
            throw new Error("Only HTTP and HTTPS protocols are allowed");
        }

        const hostname = parsedUrl.hostname;

        // Check for localhost (respect environment)
        if (this.ipValidator.isLocalHost(hostname)) {
            if (allowLocalhost) {
                log.debug("Allowing localhost in development/test", { url: urlString, env: process.env.NODE_ENV });
                return;
            } else {
                log.warn("Blocked localhost in production", { url: urlString });
                throw new Error("Requests to localhost are not allowed in production");
            }
        }

        // Validate IP addresses and perform DNS resolution
        // This will throw an error if the hostname is or resolves to a private/reserved IP
        try {
            await this.ipValidator.resolveAndValidateIP(hostname);
            log.info("Webhook URL validated successfully", { url: urlString });
        } catch (error) {
            log.warn("Webhook URL validation failed", { url: urlString, error });
            throw error;
        }
    }
}

// Export a singleton instance for convenience
export const webhookUrlValidationService = new WebhookUrlValidationService();

