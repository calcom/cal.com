/**
 * IP Validation Service
 *
 * Service class for validating IP addresses and preventing Server-Side Request Forgery (SSRF) attacks.
 * Provides comprehensive validation for both IPv4 and IPv6 addresses, including private/reserved ranges,
 * localhost detection, and DNS resolution.
 *
 * @module IPValidationService
 */

import { promises as dns } from "dns";
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
     * Checks if a string is an IPv6 address
     *
     * @param hostname - String to check
     * @returns true if it's an IPv6 address, false otherwise
     */
    private isIPv6(hostname: string): boolean {
        // Remove brackets if present
        const clean = hostname.replace(/^\[|\]$/g, "");
        // IPv6 contains colons
        return clean.includes(":");
    }

    /**
     * Helper function to expand compressed IPv6 addresses
     * Converts :: notation to full form for easier pattern matching
     *
     * @param ip - IPv6 address (possibly compressed)
     * @returns Expanded IPv6 address
     */
    private expandIPv6(ip: string): string {
        // Handle :: compression
        if (ip.includes("::")) {
            const sides = ip.split("::");
            const leftGroups = sides[0] ? sides[0].split(":") : [];
            const rightGroups = sides[1] ? sides[1].split(":") : [];
            const missingGroups = 8 - leftGroups.length - rightGroups.length;
            const middleGroups = Array(missingGroups).fill("0000");
            const allGroups = [...leftGroups, ...middleGroups, ...rightGroups];
            return allGroups.map((g) => g.padStart(4, "0")).join(":");
        }

        // Already expanded or no compression
        return ip
            .split(":")
            .map((g) => g.padStart(4, "0"))
            .join(":");
    }

    /**
     * Checks if an IPv4 address is in a private or reserved range
     *
     * Blocks the following ranges per RFC standards:
     * - 0.0.0.0/8          Current network (only valid as source address)
     * - 10.0.0.0/8         Private network (RFC 1918)
     * - 100.64.0.0/10      Shared address space (Carrier-grade NAT)
     * - 127.0.0.0/8        Loopback
     * - 169.254.0.0/16     Link-local (includes AWS metadata service)
     * - 172.16.0.0/12      Private network (RFC 1918)
     * - 192.0.0.0/24       IETF Protocol Assignments
     * - 192.0.2.0/24       Documentation (TEST-NET-1)
     * - 192.168.0.0/16     Private network (RFC 1918)
     * - 198.18.0.0/15      Benchmarking
     * - 198.51.100.0/24    Documentation (TEST-NET-2)
     * - 203.0.113.0/24     Documentation (TEST-NET-3)
     * - 224.0.0.0/4        Multicast
     * - 240.0.0.0/4        Reserved
     * - 255.255.255.255/32 Broadcast
     *
     * @param ip - IPv4 address to check
     * @returns true if the IP is private or reserved, false if public
     */
    isPrivateOrReservedIPv4(ip: string): boolean {
        const parts = ip.split(".").map(Number);

        // Validate IP format
        if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255 || isNaN(part))) {
            log.warn("Invalid IPv4 format", { ip });
            return true; // Treat invalid IPs as blocked for safety
        }

        // 0.0.0.0/8 - Current network
        if (parts[0] === 0) return true;

        // 10.0.0.0/8 - Private (RFC 1918)
        if (parts[0] === 10) return true;

        // 100.64.0.0/10 - Shared Address Space (Carrier-grade NAT)
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

        // 127.0.0.0/8 - Loopback
        if (parts[0] === 127) return true;

        // 169.254.0.0/16 - Link-local (AWS metadata service)
        if (parts[0] === 169 && parts[1] === 254) return true;

        // 172.16.0.0/12 - Private (RFC 1918)
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

        // 192.0.0.0/24 - IETF Protocol Assignments
        if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;

        // 192.0.2.0/24 - Documentation (TEST-NET-1)
        if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;

        // 192.168.0.0/16 - Private (RFC 1918)
        if (parts[0] === 192 && parts[1] === 168) return true;

        // 198.18.0.0/15 - Benchmarking
        if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;

        // 198.51.100.0/24 - Documentation (TEST-NET-2)
        if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;

        // 203.0.113.0/24 - Documentation (TEST-NET-3)
        if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;

        // 224.0.0.0/4 - Multicast
        if (parts[0] >= 224 && parts[0] <= 239) return true;

        // 240.0.0.0/4 - Reserved
        if (parts[0] >= 240 && parts[0] <= 255) return true;

        return false;
    }

    /**
     * Checks if an IPv6 address is in a private or reserved range
     *
     * Blocks the following ranges per RFC standards:
     * - ::1/128           Loopback
     * - ::/128            Unspecified address
     * - fe80::/10         Link-local
     * - fc00::/7          Unique local addresses (private)
     * - ff00::/8          Multicast
     * - 2001:db8::/32     Documentation
     * - ::ffff:0:0/96     IPv4-mapped IPv6 addresses
     *
     * @param ip - IPv6 address to check (can be compressed or full notation)
     * @returns true if the IP is private or reserved, false if public
     */
    isPrivateOrReservedIPv6(ip: string): boolean {
        // Remove brackets if present (e.g., [::1])
        const cleanIp = ip.replace(/^\[|\]$/g, "").toLowerCase();

        // ::1 - Loopback
        if (cleanIp === "::1") return true;

        // :: - Unspecified
        if (cleanIp === "::") return true;

        // Expand compressed IPv6 for easier checking
        const expandedIp = this.expandIPv6(cleanIp);

        // fe80::/10 - Link-local
        if (
            expandedIp.startsWith("fe8") ||
            expandedIp.startsWith("fe9") ||
            expandedIp.startsWith("fea") ||
            expandedIp.startsWith("feb")
        ) {
            return true;
        }

        // fc00::/7 - Unique local (private)
        if (expandedIp.startsWith("fc") || expandedIp.startsWith("fd")) {
            return true;
        }

        // ff00::/8 - Multicast
        if (expandedIp.startsWith("ff")) {
            return true;
        }

        // 2001:db8::/32 - Documentation
        if (expandedIp.startsWith("2001:0db8")) {
            return true;
        }

        // ::ffff:0:0/96 - IPv4-mapped IPv6 addresses
        // Extract the IPv4 part and validate it
        if (cleanIp.includes("::ffff:")) {
            const ipv4Match = cleanIp.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
            if (ipv4Match) {
                return this.isPrivateOrReservedIPv4(ipv4Match[1]);
            }
            // Also check hex notation: ::ffff:a9fe:a9fe (169.254.169.254)
            const hexMatch = cleanIp.match(/::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})/);
            if (hexMatch) {
                const byte1 = parseInt(hexMatch[1], 16) >> 8;
                const byte2 = parseInt(hexMatch[1], 16) & 0xff;
                const byte3 = parseInt(hexMatch[2], 16) >> 8;
                const byte4 = parseInt(hexMatch[2], 16) & 0xff;
                const ipv4 = `${byte1}.${byte2}.${byte3}.${byte4}`;
                return this.isPrivateOrReservedIPv4(ipv4);
            }
        }

        return false;
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

        // Check if hostname is already an IPv4 address
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipv4Regex.test(hostname)) {
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
            // Public IPv4 address - allow
            return;
        }

        // Check if hostname is already an IPv6 address
        if (this.isIPv6(hostname)) {
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
            // Public IPv6 address - allow
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

