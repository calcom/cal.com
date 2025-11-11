import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as dns } from "dns";

import { IPValidationService } from "./IPValidationService";

describe("IPValidationService", () => {
  let service: IPValidationService;

  beforeEach(() => {
    service = new IPValidationService();
  });

  describe("isPrivateOrReservedIPv4", () => {
    describe("localhost and loopback", () => {
      it("should block localhost IPs (127.0.0.0/8)", () => {
        expect(service.isPrivateOrReservedIPv4("127.0.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("127.0.0.2")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("127.255.255.255")).toBe(true);
      });
    });

    describe("private network ranges (RFC 1918)", () => {
      it("should block 10.0.0.0/8", () => {
        expect(service.isPrivateOrReservedIPv4("10.0.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("10.255.255.255")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("10.128.0.1")).toBe(true);
      });

      it("should block 172.16.0.0/12", () => {
        expect(service.isPrivateOrReservedIPv4("172.16.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("172.31.255.255")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("172.24.0.1")).toBe(true);
      });

      it("should block 192.168.0.0/16", () => {
        expect(service.isPrivateOrReservedIPv4("192.168.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("192.168.255.255")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("192.168.1.100")).toBe(true);
      });
    });

    describe("link-local and cloud metadata", () => {
      it("should block AWS metadata IP (169.254.169.254)", () => {
        expect(service.isPrivateOrReservedIPv4("169.254.169.254")).toBe(true);
      });

      it("should block link-local range (169.254.0.0/16)", () => {
        expect(service.isPrivateOrReservedIPv4("169.254.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("169.254.255.255")).toBe(true);
      });
    });

    describe("other reserved ranges", () => {
      it("should block current network (0.0.0.0/8)", () => {
        expect(service.isPrivateOrReservedIPv4("0.0.0.0")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("0.0.0.1")).toBe(true);
      });

      it("should block shared address space (100.64.0.0/10)", () => {
        expect(service.isPrivateOrReservedIPv4("100.64.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("100.127.255.255")).toBe(true);
      });

      it("should block documentation ranges", () => {
        expect(service.isPrivateOrReservedIPv4("192.0.2.1")).toBe(true); // TEST-NET-1
        expect(service.isPrivateOrReservedIPv4("198.51.100.1")).toBe(true); // TEST-NET-2
        expect(service.isPrivateOrReservedIPv4("203.0.113.1")).toBe(true); // TEST-NET-3
      });

      it("should block multicast (224.0.0.0/4)", () => {
        expect(service.isPrivateOrReservedIPv4("224.0.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("239.255.255.255")).toBe(true);
      });

      it("should block reserved range (240.0.0.0/4)", () => {
        expect(service.isPrivateOrReservedIPv4("240.0.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("255.255.255.255")).toBe(true);
      });
    });

    describe("public IP ranges", () => {
      it("should allow public IPs", () => {
        expect(service.isPrivateOrReservedIPv4("8.8.8.8")).toBe(false); // Google DNS
        expect(service.isPrivateOrReservedIPv4("1.1.1.1")).toBe(false); // Cloudflare DNS
        expect(service.isPrivateOrReservedIPv4("142.250.185.46")).toBe(false); // google.com
        expect(service.isPrivateOrReservedIPv4("151.101.1.195")).toBe(false); // reddit.com
      });
    });

    describe("invalid IP formats", () => {
      it("should treat invalid IPs as blocked", () => {
        expect(service.isPrivateOrReservedIPv4("256.1.1.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("1.1.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("not.an.ip.address")).toBe(true);
        expect(service.isPrivateOrReservedIPv4("")).toBe(true);
      });
    });
  });

  describe("isLocalHost", () => {
    it("should detect localhost string", () => {
      expect(service.isLocalHost("localhost")).toBe(true);
      expect(service.isLocalHost("LOCALHOST")).toBe(true);
      expect(service.isLocalHost("LocalHost")).toBe(true);
    });

    it("should detect localhost IP addresses", () => {
      expect(service.isLocalHost("127.0.0.1")).toBe(true);
      expect(service.isLocalHost("::1")).toBe(true);
      expect(service.isLocalHost("[::1]")).toBe(true);
    });

    it("should detect .local domains", () => {
      expect(service.isLocalHost("myserver.local")).toBe(true);
      expect(service.isLocalHost("test.localhost")).toBe(true);
      expect(service.isLocalHost("dev.local")).toBe(true);
    });

    it("should allow public domains", () => {
      expect(service.isLocalHost("example.com")).toBe(false);
      expect(service.isLocalHost("webhook.site")).toBe(false);
      expect(service.isLocalHost("api.github.com")).toBe(false);
    });
  });

  describe("resolveAndValidateIP", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("direct IP validation", () => {
      it("should allow public IP addresses", async () => {
        await expect(service.resolveAndValidateIP("8.8.8.8")).resolves.not.toThrow();
      });

      it("should block private IPs in production", async () => {
        // Mock production environment
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        await expect(service.resolveAndValidateIP("192.168.1.1")).rejects.toThrow(
          "private or reserved IP addresses are not allowed in production"
        );

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe("DNS resolution", () => {
      it("should resolve and validate domain to public IP", async () => {
        const mockResolve = vi.spyOn(dns, "resolve4").mockResolvedValue(["1.1.1.1"]);

        await expect(service.resolveAndValidateIP("example.com")).resolves.not.toThrow();

        expect(mockResolve).toHaveBeenCalledWith("example.com");
        mockResolve.mockRestore();
      });

      it("should block domain that resolves to private IP in production", async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        const mockResolve = vi.spyOn(dns, "resolve4").mockResolvedValue(["192.168.1.1"]);

        await expect(service.resolveAndValidateIP("evil.com")).rejects.toThrow(/private or reserved/);

        process.env.NODE_ENV = originalEnv;
        mockResolve.mockRestore();
      });

      it("should handle DNS resolution failures", async () => {
        const mockResolve = vi.spyOn(dns, "resolve4").mockRejectedValue(new Error("ENOTFOUND"));

        await expect(service.resolveAndValidateIP("nonexistent.example")).rejects.toThrow(
          "Failed to resolve hostname"
        );

        mockResolve.mockRestore();
      });
    });

    describe("environment-aware validation", () => {
      it("should allow localhost in development", async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        await expect(service.resolveAndValidateIP("127.0.0.1")).resolves.not.toThrow();

        process.env.NODE_ENV = originalEnv;
      });

      it("should allow private IPs in test environment", async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "test";

        await expect(service.resolveAndValidateIP("192.168.1.1")).resolves.not.toThrow();

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe("isPrivateOrReservedIPv6", () => {
    describe("localhost and loopback", () => {
      it("should block IPv6 localhost (::1)", () => {
        expect(service.isPrivateOrReservedIPv6("::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("[::1]")).toBe(true);
      });

      it("should block unspecified address (::)", () => {
        expect(service.isPrivateOrReservedIPv6("::")).toBe(true);
      });
    });

    describe("link-local addresses", () => {
      it("should block link-local range (fe80::/10)", () => {
        expect(service.isPrivateOrReservedIPv6("fe80::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("fe80:0000:0000:0000:0000:0000:0000:0001")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("fe80::dead:beef")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("fe9f::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("feaf::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("febf::1")).toBe(true);
      });
    });

    describe("unique local addresses (private)", () => {
      it("should block unique local range (fc00::/7)", () => {
        expect(service.isPrivateOrReservedIPv6("fc00::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("fd00::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(true);
      });
    });

    describe("multicast addresses", () => {
      it("should block multicast range (ff00::/8)", () => {
        expect(service.isPrivateOrReservedIPv6("ff00::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("ff02::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("ffff::1")).toBe(true);
      });
    });

    describe("documentation addresses", () => {
      it("should block documentation range (2001:db8::/32)", () => {
        expect(service.isPrivateOrReservedIPv6("2001:db8::1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("2001:0db8:0000:0000:0000:0000:0000:0001")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("2001:db8:85a3::8a2e:370:7334")).toBe(true);
      });
    });

    describe("IPv4-mapped IPv6 addresses", () => {
      it("should block IPv4-mapped addresses with private IPv4 (::ffff:0:0/96)", () => {
        // AWS metadata service
        expect(service.isPrivateOrReservedIPv6("::ffff:169.254.169.254")).toBe(true);
        // Private ranges
        expect(service.isPrivateOrReservedIPv6("::ffff:10.0.0.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("::ffff:192.168.1.1")).toBe(true);
        expect(service.isPrivateOrReservedIPv6("::ffff:172.16.0.1")).toBe(true);
        // Localhost
        expect(service.isPrivateOrReservedIPv6("::ffff:127.0.0.1")).toBe(true);
      });

      it("should block IPv4-mapped addresses in hex notation", () => {
        // ::ffff:a9fe:a9fe = ::ffff:169.254.169.254 (AWS metadata)
        expect(service.isPrivateOrReservedIPv6("::ffff:a9fe:a9fe")).toBe(true);
        // ::ffff:c0a8:0001 = ::ffff:192.168.0.1
        expect(service.isPrivateOrReservedIPv6("::ffff:c0a8:0001")).toBe(true);
      });

      it("should allow IPv4-mapped addresses with public IPv4", () => {
        expect(service.isPrivateOrReservedIPv6("::ffff:8.8.8.8")).toBe(false);
        expect(service.isPrivateOrReservedIPv6("::ffff:1.1.1.1")).toBe(false);
      });
    });

    describe("public IPv6 addresses", () => {
      it("should allow public IPv6 addresses", () => {
        // Google DNS
        expect(service.isPrivateOrReservedIPv6("2001:4860:4860::8888")).toBe(false);
        expect(service.isPrivateOrReservedIPv6("2001:4860:4860::8844")).toBe(false);
        // Cloudflare DNS
        expect(service.isPrivateOrReservedIPv6("2606:4700:4700::1111")).toBe(false);
        expect(service.isPrivateOrReservedIPv6("2606:4700:4700::1001")).toBe(false);
      });
    });
  });

});

