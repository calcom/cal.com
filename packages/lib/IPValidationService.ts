/**
 * IP Validation Service
 *
 * Service class for validating IP addresses and preventing Server-Side Request Forgery (SSRF) attacks.
 * Provides comprehensive validation for both IPv4 and IPv6 addresses, including private/reserved ranges,
 * localhost detection, and DNS resolution.
 *
 * Uses ipaddr.js library for IP address parsing and range detection.
 *
 * @module IPValidationService
 */

import { promises as dns } from "dns";
import * as ipaddr from "ipaddr.js";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[IPValidationService]"] });

/**
 * Service for validating IP addresses with comprehensive SSRF protection
 */
export class IPValidationService {
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
     * Checks if an IPv4 address is in a private or reserved range
     *
     * Uses ipaddr.js to detect private, reserved, loopback, link-local,
     * multicast, broadcast, and other non-public IPv4 ranges.
     *
     * @param ip - IPv4 address to check
     * @returns true if the IP is private or reserved, false if public
     */
    isPrivateOrReservedIPv4(ip: string): boolean {
        try {
            if (!ipaddr.IPv4.isValid(ip)) {
                log.warn("Invalid IPv4 format", { ip });
                return true;
            }

            const parts = ip.split(".");
            if (parts.length !== 4) {
                log.warn("Invalid IPv4 format - must have exactly 4 octets", { ip });
                return true;
            }

            const addr = ipaddr.IPv4.parse(ip);
            const range = addr.range();

            const privateRanges = [
                "unspecified",
                "broadcast",
                "multicast",
                "linkLocal",
                "loopback",
                "carrierGradeNat",
                "private",
                "reserved",
            ];

            return privateRanges.includes(range);
        } catch (error) {
            log.warn("Error parsing IPv4 address", { ip, error });
            return true;
        }
    }

    /**
     * Checks if an IPv6 address is in a private or reserved range
     *
     * Uses ipaddr.js to detect private, reserved, loopback, link-local,
     * multicast, and other non-public IPv6 ranges.
     *
     * @param ip - IPv6 address to check (can be compressed or full notation)
     * @returns true if the IP is private or reserved, false if public
     */
    isPrivateOrReservedIPv6(ip: string): boolean {
        try {
            const cleanIp = ip.replace(/^\[|\]$/g, "");

            if (!ipaddr.IPv6.isValid(cleanIp)) {
                log.warn("Invalid IPv6 format", { ip });
                return true;
            }

            const addr = ipaddr.IPv6.parse(cleanIp);
            const range = addr.range();

            if (range === "ipv4Mapped" && addr.isIPv4MappedAddress()) {
                const ipv4Addr = addr.toIPv4Address();
                return this.isPrivateOrReservedIPv4(ipv4Addr.toString());
            }

            const privateRanges = [
                "unspecified",
                "linkLocal",
                "multicast",
                "loopback",
                "uniqueLocal",
                "rfc6145",
                "rfc6052",
                "6to4",
                "teredo",
                "reserved",
            ];

            return privateRanges.includes(range);
        } catch (error) {
            log.warn("Error parsing IPv6 address", { ip, error });
            return true;
        }
    }

    /**
     * Checks if a hostname is localhost or a local domain
     *
     * @param hostname - Hostname to check
     * @returns true if localhost or .local domain, false otherwise
     */
    isLocalHost(hostname: string): boolean {
        const lower = hostname.toLowerCase();
        return (
            lower === "localhost" ||
            lower === "127.0.0.1" ||
            lower === "::1" ||
            lower === "[::1]" ||
            lower.endsWith(".local") ||
            lower.endsWith(".localhost")
        );
    }

    /**
     * Resolves a hostname to IP addresses and validates that none are private or reserved
     *
     * This function performs DNS resolution and checks each resolved IP address (both IPv4 and IPv6).
     * It respects the environment setting for localhost - allowing it in development/test
     * but blocking it in production.
     *
     * @param hostname - Hostname to resolve and validate
     * @throws Error if hostname resolves to a private or reserved IP address
     */
    async resolveAndValidateIP(hostname: string): Promise<void> {
        const allowLocalhost = this.shouldAllowLocalhost();

        if (ipaddr.IPv4.isValid(hostname)) {
            if (this.isPrivateOrReservedIPv4(hostname)) {
                if (allowLocalhost) {
                    log.debug("Allowing private IPv4 in development/test environment", {
                        ip: hostname,
                        env: process.env.NODE_ENV,
                    });
                    return;
                } else {
                    log.warn("Blocked private/reserved IPv4 address in production", { ip: hostname });
                    throw new Error("Requests to private or reserved IP addresses are not allowed in production");
                }
            }
            return;
        }

        const cleanHostname = hostname.replace(/^\[|\]$/g, "");
        if (ipaddr.IPv6.isValid(cleanHostname)) {
            if (this.isPrivateOrReservedIPv6(hostname)) {
                if (allowLocalhost) {
                    log.debug("Allowing private IPv6 in development/test environment", {
                        ip: hostname,
                        env: process.env.NODE_ENV,
                    });
                    return;
                } else {
                    log.warn("Blocked private/reserved IPv6 address in production", { ip: hostname });
                    throw new Error("Requests to private or reserved IPv6 addresses are not allowed in production");
                }
            }
            return;
        }

        // Perform DNS resolution for domain names (both A and AAAA records)
        try {
            let hasValidPublicIP = false;
            let privateIPError: Error | null = null;

            // Resolve IPv4 addresses (A records)
            try {
                const ipv4Addresses = await dns.resolve4(hostname);
                log.debug("IPv4 DNS resolution successful", { hostname, addresses: ipv4Addresses });

                for (const ip of ipv4Addresses) {
                    if (this.isPrivateOrReservedIPv4(ip)) {
                        if (allowLocalhost) {
                            log.debug("Allowing domain that resolves to private IPv4 in dev/test", {
                                hostname,
                                ip,
                                env: process.env.NODE_ENV,
                            });
                            return;
                        } else {
                            log.warn("DNS resolved to private/reserved IPv4 in production", { hostname, ip });
                            throw new Error(
                                `Hostname '${hostname}' resolves to a private or reserved IPv4 address (${ip}), which is not allowed in production`
                            );
                        }
                    }
                    hasValidPublicIP = true;
                }
            } catch (error) {
                // Check if this is a private IP error
                if (error instanceof Error && error.message.includes("private or reserved")) {
                    privateIPError = error;
                }
                // IPv4 resolution failed, try IPv6
                log.debug("IPv4 resolution failed, trying IPv6", { hostname, error });
            }

            // Resolve IPv6 addresses (AAAA records)
            try {
                const ipv6Addresses = await dns.resolve6(hostname);
                log.debug("IPv6 DNS resolution successful", { hostname, addresses: ipv6Addresses });

                for (const ip of ipv6Addresses) {
                    if (this.isPrivateOrReservedIPv6(ip)) {
                        if (allowLocalhost) {
                            log.debug("Allowing domain that resolves to private IPv6 in dev/test", {
                                hostname,
                                ip,
                                env: process.env.NODE_ENV,
                            });
                            return;
                        } else {
                            log.warn("DNS resolved to private/reserved IPv6 in production", { hostname, ip });
                            throw new Error(
                                `Hostname '${hostname}' resolves to a private or reserved IPv6 address (${ip}), which is not allowed in production`
                            );
                        }
                    }
                    hasValidPublicIP = true;
                }
            } catch (error) {
                // Check if this is a private IP error
                if (error instanceof Error && error.message.includes("private or reserved")) {
                    privateIPError = error;
                }
                // IPv6 resolution failed
                log.debug("IPv6 resolution failed", { hostname, error });
            }

            if (hasValidPublicIP) {
                log.debug("Hostname validated successfully", { hostname });
                return;
            }

            // If we detected a private IP, throw that error
            if (privateIPError) {
                throw privateIPError;
            }

            // Both IPv4 and IPv6 resolution failed
            if (allowLocalhost) {
                log.debug("Allowing DNS resolution failure in development/test environment", {
                    hostname,
                    env: process.env.NODE_ENV,
                });
                return;
            }

            throw new Error(`Failed to resolve hostname '${hostname}': No valid DNS records found`);
        } catch (error) {
            // Check if this is our custom error from private IP detection
            if (error instanceof Error && error.message.includes("private or reserved")) {
                throw error;
            }

            // DNS resolution failed
            log.warn("DNS resolution failed", { hostname, error });
            throw new Error(`Failed to resolve hostname '${hostname}': ${(error as Error).message}`);
        }
    }
}

// Export a singleton instance for convenience
export const ipValidationService = new IPValidationService();

