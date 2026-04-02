import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@calcom/features/custom-domains/di/custom-domain-service.container", () => ({
  getCustomDomainService: vi.fn(),
}));

import { getCustomDomainService } from "@calcom/features/custom-domains/di/custom-domain-service.container";

import { removeHandler } from "./custom-domain.remove.handler";
import { replaceHandler } from "./custom-domain.replace.handler";
import { getHandler } from "./custom-domain.get.handler";
import { verifyHandler } from "./custom-domain.verify.handler";
import { checkHandler } from "./custom-domain.check.handler";

const mockRemoveDomain = vi.fn();
const mockReplaceDomain = vi.fn();
const mockGetDomain = vi.fn();
const mockVerifyDomainStatus = vi.fn();
const mockCheckAvailability = vi.fn();

function createMockCtx(organizationId: number) {
  return {
    user: { id: 1, organizationId } as any,
    organizationId,
  };
}

describe("Custom Domain Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCustomDomainService).mockReturnValue({
      removeDomain: mockRemoveDomain,
      replaceDomain: mockReplaceDomain,
      getDomain: mockGetDomain,
      verifyDomainStatus: mockVerifyDomainStatus,
      checkAvailability: mockCheckAvailability,
    } as any);
  });

  describe("removeHandler", () => {
    it("passes organizationId to service.removeDomain", async () => {
      const ctx = createMockCtx(42);
      mockRemoveDomain.mockResolvedValue({ success: true });

      await removeHandler({ ctx });

      expect(mockRemoveDomain).toHaveBeenCalledWith({ teamId: 42 });
    });

    it("propagates service errors", async () => {
      const ctx = createMockCtx(100);
      mockRemoveDomain.mockRejectedValue(new Error("No custom domain found for this team"));

      await expect(removeHandler({ ctx })).rejects.toThrow(
        "No custom domain found for this team"
      );
    });
  });

  describe("replaceHandler", () => {
    it("passes organizationId and newSlug to service", async () => {
      const ctx = createMockCtx(55);
      mockReplaceDomain.mockResolvedValue({ id: "d1", slug: "new.example.com" });

      await replaceHandler({ ctx, input: { newSlug: "new.example.com" } });

      expect(mockReplaceDomain).toHaveBeenCalledWith({ teamId: 55, newSlug: "new.example.com" });
    });

    it("propagates service errors", async () => {
      const ctx = createMockCtx(100);
      mockReplaceDomain.mockRejectedValue(new Error("Failed to create domain on hosting provider"));

      await expect(
        replaceHandler({ ctx, input: { newSlug: "new.example.com" } })
      ).rejects.toThrow("Failed to create domain on hosting provider");
    });
  });

  describe("getHandler", () => {
    it("passes organizationId to service.getDomain", async () => {
      const ctx = createMockCtx(77);
      const domain = { id: "d1", slug: "app.example.com", verified: true };
      mockGetDomain.mockResolvedValue(domain);

      const result = await getHandler({ ctx });

      expect(mockGetDomain).toHaveBeenCalledWith(77);
      expect(result).toEqual(domain);
    });

    it("returns null when no domain exists", async () => {
      const ctx = createMockCtx(100);
      mockGetDomain.mockResolvedValue(null);

      const result = await getHandler({ ctx });

      expect(result).toBeNull();
    });
  });

  describe("verifyHandler", () => {
    it("passes organizationId to service.verifyDomainStatus", async () => {
      const ctx = createMockCtx(88);
      const status = { status: "PENDING" };
      mockVerifyDomainStatus.mockResolvedValue(status);

      const result = await verifyHandler({ ctx });

      expect(mockVerifyDomainStatus).toHaveBeenCalledWith(88);
      expect(result).toEqual(status);
    });
  });

  describe("checkHandler", () => {
    it("delegates to service.checkAvailability", async () => {
      const ctx = createMockCtx(100);
      mockCheckAvailability.mockResolvedValue({ available: true });

      const result = await checkHandler({ ctx, input: { slug: "free.example.com" } });

      expect(result).toEqual({ available: true });
      expect(mockCheckAvailability).toHaveBeenCalledWith("free.example.com");
    });

    it("returns service result for unavailable domain", async () => {
      const ctx = createMockCtx(100);
      mockCheckAvailability.mockResolvedValue({ available: false });

      const result = await checkHandler({ ctx, input: { slug: "taken.example.com" } });

      expect(result).toEqual({ available: false });
    });
  });
});
