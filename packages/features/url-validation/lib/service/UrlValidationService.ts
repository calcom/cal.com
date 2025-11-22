/**
 * URL Validation Service
 *
 * Service class for validating URLs with SSRF protection.
 * Provides both synchronous (client-safe) and asynchronous (with DNS resolution) validation.
 *
 * @module UrlValidationService
 */

import { URL } from "url";

import logger from "@calcom/lib/logger";

import type { HostValidationService } from "./HostValidationService";

const log = logger.getSubLogger({ prefix: ["[UrlValidationService]"] });

/**
 * Service for validating URLs with comprehensive SSRF protection
 */
export class UrlValidationService {
    private hostValidator: HostValidationService;

    /**
     * Constructor with dependency injection for host validation
     *
     * @param deps - Dependencies object containing hostValidator
     */
    constructor(deps: { hostValidator: HostValidationService }) {
        this.hostValidator = deps.hostValidator;
    }

    /**
     * Check if localhost and private IPs should be allowed based on environment
     * This function is called at runtime to respect environment changes in tests
     */
    private shouldAllowLocalhost(): boolean {
        return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    }

    /**
     * Parses a URL string and returns the parsed URL or validation failure
     *
     * @param urlString - URL string to parse
     * @returns Object with parsed URL and validity status
     */
    private parseUrl(urlString: string): { url: URL; isValid: true } | { url: null; isValid: false } {
        try {
            const url = new URL(urlString);
            return { url, isValid: true };
        } catch (error) {
            log.warn("Invalid URL format", { url: urlString, error });
            return { url: null, isValid: false };
        }
    }

    /**
     * Ensures the URL uses HTTP or HTTPS protocol
     *
     * @param parsedUrl - Parsed URL object
     * @param urlString - Original URL string for logging
     * @returns true if protocol is valid, false otherwise
     * @throws Error in async context if protocol is invalid
     */
    private ensureWebAddress(parsedUrl: URL, urlString: string, throwError: boolean = false): boolean {
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            const message = "Only HTTP and HTTPS protocols are allowed";
            log.warn("Blocked non-HTTP(S) protocol", { url: urlString, protocol: parsedUrl.protocol });
            if (throwError) {
                throw new Error(message);
            }
            return false;
        }
        return true;
    }

    /**
     * Validates a URL synchronously (for use in Zod schemas and client-side code)
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

        const parseResult = this.parseUrl(urlString);
        if (!parseResult.isValid) {
            return false;
        }

        const parsedUrl = parseResult.url;

        // Only allow HTTP and HTTPS protocols
        if (!this.ensureWebAddress(parsedUrl, urlString, false)) {
            return false;
        }

        const hostname = parsedUrl.hostname;

        // Check for localhost (respect environment)
        if (this.hostValidator.isLocalHost(hostname)) {
            return allowLocalhost;
        }

        // Check if hostname is a private or reserved IP
        if (this.hostValidator.isPrivateOrReservedIP(hostname)) {
            return allowLocalhost;
        }

        // Basic validation passed
        return true;
    }

    /**
     * Validates a URL asynchronously with DNS resolution (server-side only)
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

        const parseResult = this.parseUrl(urlString);
        if (!parseResult.isValid) {
            throw new Error("Invalid URL format");
        }

        const parsedUrl = parseResult.url;

        // Only allow HTTP and HTTPS protocols
        this.ensureWebAddress(parsedUrl, urlString, true);

        const hostname = parsedUrl.hostname;

        // Check for localhost (respect environment)
        if (this.hostValidator.isLocalHost(hostname)) {
            if (!allowLocalhost) {
                log.warn("Blocked localhost", { url: urlString });
                throw new Error("Requests to localhost are not allowed");
            }
            return;
        }

        // Validate IP addresses and perform DNS resolution
        // This will throw an error if the hostname is or resolves to a private/reserved IP
        try {
            await this.hostValidator.resolveAndValidateIP(hostname);
        } catch (error) {
            log.warn("URL validation failed", { url: urlString, error });
            throw error;
        }
    }
}

