import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as dns } from "dns";

import { WebhookUrlValidationService } from "./WebhookUrlValidationService";

describe("WebhookUrlValidationService", () => {
    let service: WebhookUrlValidationService;

    beforeEach(() => {
        service = new WebhookUrlValidationService();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("validateSync", () => {
        describe("protocol validation", () => {
            it("should allow HTTP and HTTPS", () => {
                expect(service.validateSync("http://example.com")).toBe(true);
                expect(service.validateSync("https://example.com")).toBe(true);
            });

            it("should block non-HTTP(S) protocols", () => {
                expect(service.validateSync("file:///etc/passwd")).toBe(false);
                expect(service.validateSync("ftp://example.com")).toBe(false);
                expect(service.validateSync("gopher://example.com")).toBe(false);
                expect(service.validateSync("dict://localhost:5432")).toBe(false);
            });
        });

        describe("localhost detection", () => {
            it("should block localhost in production", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                expect(service.validateSync("http://localhost:3000")).toBe(false);
                expect(service.validateSync("https://127.0.0.1")).toBe(false);
                expect(service.validateSync("https://[::1]")).toBe(false);

                process.env.NODE_ENV = originalEnv;
            });

            it("should allow localhost in development", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "development";

                expect(service.validateSync("http://localhost:3000")).toBe(true);
                expect(service.validateSync("https://127.0.0.1")).toBe(true);
                expect(service.validateSync("https://[::1]")).toBe(true);

                process.env.NODE_ENV = originalEnv;
            });
        });

        describe("private IPv4 detection", () => {
            it("should block private IPv4 addresses in production", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                expect(service.validateSync("http://192.168.1.1")).toBe(false);
                expect(service.validateSync("http://10.0.0.1")).toBe(false);
                expect(service.validateSync("http://172.16.0.1")).toBe(false);

                process.env.NODE_ENV = originalEnv;
            });

            it("should block AWS metadata IP", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                expect(service.validateSync("http://169.254.169.254")).toBe(false);

                process.env.NODE_ENV = originalEnv;
            });

            it("should allow private IPv4 addresses in development", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "development";

                expect(service.validateSync("http://192.168.1.1")).toBe(true);
                expect(service.validateSync("http://10.0.0.1")).toBe(true);

                process.env.NODE_ENV = originalEnv;
            });
        });

        describe("private IPv6 detection", () => {
            it("should block private IPv6 addresses in production", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                // Link-local
                expect(service.validateSync("http://[fe80::1]")).toBe(false);
                // Unique local
                expect(service.validateSync("http://[fc00::1]")).toBe(false);
                expect(service.validateSync("http://[fd00::1]")).toBe(false);
                // Multicast
                expect(service.validateSync("http://[ff02::1]")).toBe(false);
                // Documentation
                expect(service.validateSync("http://[2001:db8::1]")).toBe(false);

                process.env.NODE_ENV = originalEnv;
            });

            it("should block IPv4-mapped IPv6 addresses with private IPv4", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                // AWS metadata via IPv6
                expect(service.validateSync("http://[::ffff:169.254.169.254]")).toBe(false);
                // Private ranges via IPv6
                expect(service.validateSync("http://[::ffff:192.168.1.1]")).toBe(false);
                expect(service.validateSync("http://[::ffff:10.0.0.1]")).toBe(false);

                process.env.NODE_ENV = originalEnv;
            });

            it("should allow public IPv6 addresses", () => {
                // Google DNS
                expect(service.validateSync("http://[2001:4860:4860::8888]")).toBe(true);
                // Cloudflare DNS
                expect(service.validateSync("http://[2606:4700:4700::1111]")).toBe(true);
            });

            it("should allow private IPv6 addresses in development", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "development";

                expect(service.validateSync("http://[fe80::1]")).toBe(true);
                expect(service.validateSync("http://[fc00::1]")).toBe(true);

                process.env.NODE_ENV = originalEnv;
            });
        });

        describe("public URLs", () => {
            it("should allow public domain names", () => {
                expect(service.validateSync("https://example.com")).toBe(true);
                expect(service.validateSync("https://webhook.site/test")).toBe(true);
                expect(service.validateSync("https://api.github.com/webhook")).toBe(true);
            });

            it("should allow public IP addresses", () => {
                expect(service.validateSync("https://8.8.8.8")).toBe(true);
                expect(service.validateSync("https://1.1.1.1")).toBe(true);
            });
        });

        describe("invalid URLs", () => {
            it("should reject malformed URLs", () => {
                expect(service.validateSync("not-a-url")).toBe(false);
                expect(service.validateSync("")).toBe(false);
                expect(service.validateSync("javascript:alert(1)")).toBe(false);
            });
        });
    });

    describe("validateAsync", () => {
        describe("protocol validation", () => {
            it("should allow HTTP and HTTPS", async () => {
                const mockResolve4 = vi.spyOn(dns, "resolve4").mockResolvedValue(["1.1.1.1"]);
                const mockResolve6 = vi.spyOn(dns, "resolve6").mockRejectedValue(new Error("No AAAA records"));

                await expect(service.validateAsync("http://example.com")).resolves.not.toThrow();
                await expect(service.validateAsync("https://example.com")).resolves.not.toThrow();

                mockResolve4.mockRestore();
                mockResolve6.mockRestore();
            });

            it("should reject non-HTTP(S) protocols", async () => {
                await expect(service.validateAsync("file:///etc/passwd")).rejects.toThrow(
                    "Only HTTP and HTTPS protocols are allowed"
                );
                await expect(service.validateAsync("ftp://example.com")).rejects.toThrow(
                    "Only HTTP and HTTPS protocols are allowed"
                );
            });
        });

        describe("localhost validation", () => {
            it("should block localhost in production", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                await expect(service.validateAsync("http://localhost:3000")).rejects.toThrow(
                    "not allowed in production"
                );
                await expect(service.validateAsync("http://127.0.0.1")).rejects.toThrow(
                    "not allowed in production"
                );
                await expect(service.validateAsync("http://[::1]")).rejects.toThrow("not allowed in production");

                process.env.NODE_ENV = originalEnv;
            });

            it("should allow localhost in development", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "development";

                await expect(service.validateAsync("http://localhost:3000")).resolves.not.toThrow();
                await expect(service.validateAsync("http://127.0.0.1")).resolves.not.toThrow();
                await expect(service.validateAsync("http://[::1]")).resolves.not.toThrow();

                process.env.NODE_ENV = originalEnv;
            });
        });

        describe("DNS resolution and private IP detection", () => {
            it("should allow domains resolving to public IPv4", async () => {
                const mockResolve4 = vi.spyOn(dns, "resolve4").mockResolvedValue(["1.1.1.1"]);
                const mockResolve6 = vi.spyOn(dns, "resolve6").mockRejectedValue(new Error("No AAAA records"));

                await expect(service.validateAsync("https://example.com")).resolves.not.toThrow();

                mockResolve4.mockRestore();
                mockResolve6.mockRestore();
            });

            it("should allow domains resolving to public IPv6", async () => {
                const mockResolve4 = vi.spyOn(dns, "resolve4").mockRejectedValue(new Error("No A records"));
                const mockResolve6 = vi.spyOn(dns, "resolve6").mockResolvedValue(["2001:4860:4860::8888"]);

                await expect(service.validateAsync("https://example.com")).resolves.not.toThrow();

                mockResolve4.mockRestore();
                mockResolve6.mockRestore();
            });

            it("should block domains resolving to private IPv4 in production", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                const mockResolve4 = vi.spyOn(dns, "resolve4").mockResolvedValue(["192.168.1.1"]);
                const mockResolve6 = vi.spyOn(dns, "resolve6").mockRejectedValue(new Error("No AAAA records"));

                await expect(service.validateAsync("https://evil.com")).rejects.toThrow("private or reserved");

                process.env.NODE_ENV = originalEnv;
                mockResolve4.mockRestore();
                mockResolve6.mockRestore();
            });

            it("should block domains resolving to private IPv6 in production", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                const mockResolve4 = vi.spyOn(dns, "resolve4").mockRejectedValue(new Error("No A records"));
                const mockResolve6 = vi.spyOn(dns, "resolve6").mockResolvedValue(["fc00::1"]);

                await expect(service.validateAsync("https://evil.com")).rejects.toThrow("private or reserved");

                process.env.NODE_ENV = originalEnv;
                mockResolve4.mockRestore();
                mockResolve6.mockRestore();
            });

            it("should allow domains resolving to private IPs in development", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "development";

                const mockResolve4 = vi.spyOn(dns, "resolve4").mockResolvedValue(["192.168.1.1"]);
                const mockResolve6 = vi.spyOn(dns, "resolve6").mockRejectedValue(new Error("No AAAA records"));

                await expect(service.validateAsync("https://internal.dev")).resolves.not.toThrow();

                process.env.NODE_ENV = originalEnv;
                mockResolve4.mockRestore();
                mockResolve6.mockRestore();
            });
        });

        describe("invalid URLs", () => {
            it("should reject malformed URLs", async () => {
                await expect(service.validateAsync("not-a-url")).rejects.toThrow("Invalid URL format");
                await expect(service.validateAsync("")).rejects.toThrow("Invalid URL format");
            });
        });

        describe("DNS resolution failures", () => {
            it("should allow DNS resolution errors in test environment", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "test";

                const mockResolve4 = vi.spyOn(dns, "resolve4").mockRejectedValue(new Error("ENOTFOUND"));
                const mockResolve6 = vi.spyOn(dns, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

                await expect(service.validateAsync("https://nonexistent.example")).resolves.not.toThrow();

                process.env.NODE_ENV = originalEnv;
                mockResolve4.mockRestore();
                mockResolve6.mockRestore();
            });

            it("should reject DNS resolution errors in production", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                const mockResolve4 = vi.spyOn(dns, "resolve4").mockRejectedValue(new Error("ENOTFOUND"));
                const mockResolve6 = vi.spyOn(dns, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

                await expect(service.validateAsync("https://nonexistent.example")).rejects.toThrow(
                    "Failed to resolve hostname"
                );

                process.env.NODE_ENV = originalEnv;
                mockResolve4.mockRestore();
                mockResolve6.mockRestore();
            });
        });

        describe("environment-aware validation", () => {
            it("should respect NODE_ENV=development", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "development";

                await expect(service.validateAsync("http://localhost:4000")).resolves.not.toThrow();
                await expect(service.validateAsync("http://192.168.1.5")).resolves.not.toThrow();
                await expect(service.validateAsync("http://[fc00::1]")).resolves.not.toThrow();

                process.env.NODE_ENV = originalEnv;
            });

            it("should respect NODE_ENV=production", async () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "production";

                await expect(service.validateAsync("http://localhost:4000")).rejects.toThrow();
                await expect(service.validateAsync("http://192.168.1.5")).rejects.toThrow();
                await expect(service.validateAsync("http://[fc00::1]")).rejects.toThrow();

                process.env.NODE_ENV = originalEnv;
            });
        });
    });
});

