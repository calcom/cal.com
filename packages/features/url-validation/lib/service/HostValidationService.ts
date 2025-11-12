/**
 * Host Validation Service
 *
 * Service class for validating IP addresses and hostnames, preventing Server-Side Request Forgery (SSRF) attacks.
 * Provides comprehensive validation for both IPv4 and IPv6 addresses, including private/reserved ranges,
 * localhost detection, and DNS resolution.
 *
 * Uses ipaddr.js library for IP address parsing and range detection.
 *
 * @module HostValidationService
 */

import { promises as dns } from "dns";
import * as ipaddr from "ipaddr.js";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[HostValidationService]"] });

/**
 * Service for validating hosts (IP addresses and hostnames) with comprehensive SSRF protection
 */
export class HostValidationService {
  /**
   * Check if localhost and private IPs should be allowed based on environment
   * This function is called at runtime to respect environment changes in tests
   */
  private shouldAllowLocalhost(): boolean {
    return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
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
        return true;
      }

      const parts = ip.split(".");
      if (parts.length !== 4) {
        return true;
      }

      const addr = ipaddr.IPv4.parse(ip);
      const range = addr.range();

      return range !== "unicast";
    } catch {
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
        return true;
      }

      const addr = ipaddr.IPv6.parse(cleanIp);
      const range = addr.range();

      if (range === "ipv4Mapped" && addr.isIPv4MappedAddress()) {
        const ipv4Addr = addr.toIPv4Address();
        return this.isPrivateOrReservedIPv4(ipv4Addr.toString());
      }

      return range !== "unicast";
    } catch {
      return true;
    }
  }

  /**
   * Checks if an IP address (IPv4 or IPv6) is in a private or reserved range
   *
   * Automatically detects the IP version and calls the appropriate validation method.
   *
   * @param ip - IP address to check (IPv4 or IPv6)
   * @returns true if the IP is private or reserved, false if public
   */
  isPrivateOrReservedIP(ip: string): boolean {
    const cleanIp = ip.replace(/^\[|\]$/g, "");

    if (ipaddr.IPv4.isValid(ip)) {
      return this.isPrivateOrReservedIPv4(ip);
    }

    if (ipaddr.IPv6.isValid(cleanIp)) {
      return this.isPrivateOrReservedIPv6(ip);
    }

    // If it's not a valid IP address, consider it reserved
    return true;
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
   * Resolves a hostname to IP addresses via DNS lookup
   *
   * @param hostname - Hostname to resolve
   * @returns Array of IP addresses the hostname resolves to
   * @throws Error if DNS resolution fails
   */
  async resolveHostname(hostname: string): Promise<string[]> {
    const allowLocalhost = this.shouldAllowLocalhost();

    try {
      const addresses = await dns.lookup(hostname, { all: true });

      if (addresses.length === 0) {
        if (allowLocalhost) {
          return [];
        }
        throw new Error(`Failed to resolve hostname '${hostname}': No valid DNS records found`);
      }

      return addresses.map((addr) => addr.address);
    } catch (error) {
      // DNS resolution failed
      if (allowLocalhost) {
        return [];
      }

      throw new Error(`Failed to resolve hostname '${hostname}': ${(error as Error).message}`);
    }
  }

  /**
   * Validates that an IP address is not private or reserved
   *
   * @param ip - IP address to validate
   * @throws Error if IP is private or reserved in production environment
   */
  validateIP(ip: string): void {
    const allowLocalhost = this.shouldAllowLocalhost();

    if (this.isPrivateOrReservedIP(ip)) {
      if (allowLocalhost) {
        return;
      }
      throw new Error("Requests to private or reserved IP addresses are not allowed in production");
    }
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

    // Check if hostname is already an IP address
    if (ipaddr.IPv4.isValid(hostname)) {
      this.validateIP(hostname);
      return;
    }

    const cleanHostname = hostname.replace(/^\[|\]$/g, "");
    if (ipaddr.IPv6.isValid(cleanHostname)) {
      this.validateIP(hostname);
      return;
    }

    // Perform DNS resolution for domain names
    const addresses = await this.resolveHostname(hostname);

    for (const address of addresses) {
      if (this.isPrivateOrReservedIP(address)) {
        if (allowLocalhost) {
          return;
        }
        throw new Error(
          `Hostname '${hostname}' resolves to a private or reserved IP address (${address}), which is not allowed in production`
        );
      }
    }
  }
}

