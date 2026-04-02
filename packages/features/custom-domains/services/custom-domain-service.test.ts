import { describe, it, expect, vi, beforeEach } from "vitest";

import { createDomainManager } from "@calcom/domains/create-domain-manager";
import type { DomainManager } from "@calcom/domains/domain-manager";

import { DomainVerificationStatus } from "../constants";
import { CustomDomainService } from "./custom-domain-service";

vi.mock("@calcom/domains/create-domain-manager");

const mockDomain = {
  id: "domain-1",
  teamId: 1,
  slug: "app.example.com",
  verified: false,
  lastCheckedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMockRepository() {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findBySlugWithTeam: vi.fn(),
    findByTeamId: vi.fn(),
    create: vi.fn(),
    updateVerificationStatus: vi.fn(),
    updateSlug: vi.fn(),
    delete: vi.fn(),
    deleteByTeamId: vi.fn(),
    existsBySlug: vi.fn(),
    getUnverifiedDomainsForCheck: vi.fn(),
  };
}

function createMockDomainManager(): { [K in keyof DomainManager]: ReturnType<typeof vi.fn> } {
  return {
    register: vi.fn(),
    unregister: vi.fn(),
    getDomainInfo: vi.fn(),
    getConfigStatus: vi.fn(),
    triggerVerification: vi.fn(),
    getDnsConfig: vi.fn(),
  };
}

describe("CustomDomainService", () => {
  let service: CustomDomainService;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockDomainManager: ReturnType<typeof createMockDomainManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    mockDomainManager = createMockDomainManager();
    vi.mocked(createDomainManager).mockReturnValue(mockDomainManager as unknown as ReturnType<typeof createDomainManager>);
    service = new CustomDomainService({
      customDomainRepository: mockRepo as any,
    });
  });

  describe("addDomain", () => {
    it("throws on invalid domain format", async () => {
      await expect(service.addDomain({ teamId: 1, slug: "not valid!" })).rejects.toThrow(
        "Invalid domain format"
      );
    });

    it("throws if team already has a custom domain", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);

      await expect(service.addDomain({ teamId: 1, slug: "new.example.com" })).rejects.toThrow(
        "Team already has a custom domain configured"
      );
    });

    it("throws if slug is already in use", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);
      mockRepo.existsBySlug.mockResolvedValue(true);

      await expect(service.addDomain({ teamId: 1, slug: "taken.example.com" })).rejects.toThrow(
        "Domain is already in use"
      );
    });

    it("throws when register returns unsuccessful", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: false });

      await expect(service.addDomain({ teamId: 1, slug: "app.example.com" })).rejects.toThrow(
        "Failed to register domain with provider"
      );
    });

    it("does not create DB record when registration fails", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: false });

      await expect(service.addDomain({ teamId: 1, slug: "app.example.com" })).rejects.toThrow();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("creates domain successfully", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.create.mockResolvedValue(mockDomain);

      const result = await service.addDomain({ teamId: 1, slug: "app.example.com" });

      expect(mockDomainManager.register).toHaveBeenCalledWith("app.example.com");
      expect(mockRepo.create).toHaveBeenCalledWith({ teamId: 1, slug: "app.example.com" });
      expect(result).toEqual(mockDomain);
    });

    it("normalizes slug to lowercase and trimmed", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.create.mockResolvedValue(mockDomain);

      await service.addDomain({ teamId: 1, slug: "  APP.Example.COM  " });

      expect(mockDomainManager.register).toHaveBeenCalledWith("app.example.com");
      expect(mockRepo.create).toHaveBeenCalledWith({ teamId: 1, slug: "app.example.com" });
    });

    it("propagates provider network errors without creating DB record", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockRejectedValue(new Error("Network timeout"));

      await expect(service.addDomain({ teamId: 1, slug: "app.example.com" })).rejects.toThrow(
        "Network timeout"
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("rolls back provider domain if DB creation fails", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.create.mockRejectedValue(new Error("DB constraint violation"));

      await expect(service.addDomain({ teamId: 1, slug: "app.example.com" })).rejects.toThrow(
        "DB constraint violation"
      );
      expect(mockDomainManager.unregister).toHaveBeenCalledWith("app.example.com");
    });

    it("throws original error even if provider rollback fails", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.create.mockRejectedValue(new Error("DB constraint violation"));
      mockDomainManager.unregister.mockRejectedValue(new Error("Provider cleanup failed"));

      await expect(service.addDomain({ teamId: 1, slug: "app.example.com" })).rejects.toThrow(
        "DB constraint violation"
      );
    });
  });

  describe("removeDomain", () => {
    it("throws when no domain found for team", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);

      await expect(service.removeDomain({ teamId: 1 })).rejects.toThrow(
        "No custom domain found for this team"
      );
    });

    it("unregisters from provider and deletes from DB on success", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.unregister.mockResolvedValue(undefined);
      mockRepo.delete.mockResolvedValue(mockDomain);

      const result = await service.removeDomain({ teamId: 1 });

      expect(mockDomainManager.unregister).toHaveBeenCalledWith("app.example.com");
      expect(mockRepo.delete).toHaveBeenCalledWith("domain-1");
      expect(result).toEqual({ success: true });
    });

    it("propagates provider errors without deleting DB record", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.unregister.mockRejectedValue(new Error("Provider API down"));

      await expect(service.removeDomain({ teamId: 1 })).rejects.toThrow("Provider API down");
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("replaceDomain", () => {
    it("throws when no existing domain found", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);

      await expect(service.replaceDomain({ teamId: 1, newSlug: "new.example.com" })).rejects.toThrow(
        "No custom domain found for this team"
      );
    });

    it("returns existing domain if slug is unchanged", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);

      const result = await service.replaceDomain({ teamId: 1, newSlug: "app.example.com" });

      expect(result).toEqual(mockDomain);
      expect(mockDomainManager.register).not.toHaveBeenCalled();
    });

    it("throws if new slug is already taken", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockRepo.existsBySlug.mockResolvedValue(true);

      await expect(service.replaceDomain({ teamId: 1, newSlug: "taken.example.com" })).rejects.toThrow(
        "Domain is already in use"
      );
    });

    it("throws when register returns unsuccessful", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: false });

      await expect(service.replaceDomain({ teamId: 1, newSlug: "new.example.com" })).rejects.toThrow(
        "Failed to register domain with provider"
      );
    });

    it("does not update DB when registration fails", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: false });

      await expect(service.replaceDomain({ teamId: 1, newSlug: "new.example.com" })).rejects.toThrow();
      expect(mockRepo.updateSlug).not.toHaveBeenCalled();
    });

    it("replaces domain successfully", async () => {
      const updatedDomain = { ...mockDomain, slug: "new.example.com" };
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.updateSlug.mockResolvedValue(updatedDomain);
      mockDomainManager.unregister.mockResolvedValue(undefined);

      const result = await service.replaceDomain({ teamId: 1, newSlug: "new.example.com" });

      expect(mockDomainManager.register).toHaveBeenCalledWith("new.example.com");
      expect(mockRepo.updateSlug).toHaveBeenCalledWith("domain-1", "new.example.com");
      expect(mockDomainManager.unregister).toHaveBeenCalledWith("app.example.com");
      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(result).toEqual(updatedDomain);
    });

    it("throws on invalid domain format", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);

      await expect(service.replaceDomain({ teamId: 1, newSlug: "not valid!" })).rejects.toThrow(
        "Invalid domain format"
      );
      expect(mockDomainManager.register).not.toHaveBeenCalled();
    });

    it("normalizes new slug to lowercase and trimmed", async () => {
      const updatedDomain = { ...mockDomain, slug: "new.example.com" };
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.updateSlug.mockResolvedValue(updatedDomain);
      mockDomainManager.unregister.mockResolvedValue(undefined);

      await service.replaceDomain({ teamId: 1, newSlug: "  NEW.Example.COM  " });

      expect(mockDomainManager.register).toHaveBeenCalledWith("new.example.com");
      expect(mockRepo.updateSlug).toHaveBeenCalledWith("domain-1", "new.example.com");
    });

    it("treats case-different slug as unchanged after normalization", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);

      const result = await service.replaceDomain({ teamId: 1, newSlug: "APP.Example.COM" });

      expect(result).toEqual(mockDomain);
      expect(mockDomainManager.register).not.toHaveBeenCalled();
    });

    it("rolls back provider domain if DB updateSlug fails", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.updateSlug.mockRejectedValue(new Error("DB update failed"));

      await expect(service.replaceDomain({ teamId: 1, newSlug: "new.example.com" })).rejects.toThrow(
        "DB update failed"
      );
      expect(mockDomainManager.unregister).toHaveBeenCalledWith("new.example.com");
    });

    it("throws original error even if provider rollback fails during replace", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.updateSlug.mockRejectedValue(new Error("DB update failed"));
      mockDomainManager.unregister.mockRejectedValue(new Error("Provider cleanup failed"));

      await expect(service.replaceDomain({ teamId: 1, newSlug: "new.example.com" })).rejects.toThrow(
        "DB update failed"
      );
    });

    it("swallows error when old domain unregistration fails", async () => {
      const updatedDomain = { ...mockDomain, slug: "new.example.com" };
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockRepo.existsBySlug.mockResolvedValue(false);
      mockDomainManager.register.mockResolvedValue({ success: true });
      mockRepo.updateSlug.mockResolvedValue(updatedDomain);
      mockDomainManager.unregister.mockRejectedValue(new Error("Provider API error"));

      const result = await service.replaceDomain({ teamId: 1, newSlug: "new.example.com" });

      expect(result).toEqual(updatedDomain);
    });
  });

  describe("checkAvailability", () => {
    it("throws on invalid domain format", async () => {
      await expect(service.checkAvailability("invalid!")).rejects.toThrow("Invalid domain format");
    });

    it("returns available true when slug does not exist", async () => {
      mockRepo.existsBySlug.mockResolvedValue(false);

      const result = await service.checkAvailability("free.example.com");
      expect(result).toEqual({ available: true });
    });

    it("returns available false when slug exists", async () => {
      mockRepo.existsBySlug.mockResolvedValue(true);

      const result = await service.checkAvailability("taken.example.com");
      expect(result).toEqual({ available: false });
    });
  });

  describe("getDomain", () => {
    it("delegates to repository findByTeamId", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);

      const result = await service.getDomain(1);

      expect(mockRepo.findByTeamId).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockDomain);
    });
  });

  describe("verifyDomainStatus", () => {
    it("returns NOT_FOUND when no domain exists for team", async () => {
      mockRepo.findByTeamId.mockResolvedValue(null);

      const result = await service.verifyDomainStatus(1);

      expect(result).toEqual({ status: "NOT_FOUND" });
    });

    it("returns NOT_FOUND when provider returns null for domain", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue(null);

      const result = await service.verifyDomainStatus(1);

      expect(result.status).toBe("NOT_FOUND");
    });

    it("returns INVALID_CONFIGURATION when config is not configured", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: true });
      mockDomainManager.getConfigStatus.mockResolvedValue({ configured: false });

      const result = await service.verifyDomainStatus(1);

      expect(result.status).toBe("INVALID_CONFIGURATION");
    });

    it("returns CONFLICTING_DNS when config has conflicts", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: true });
      mockDomainManager.getConfigStatus.mockResolvedValue({
        configured: true,
        conflicts: [{ name: "app.example.com", type: "A", value: "1.2.3.4" }],
      });

      const result = await service.verifyDomainStatus(1);

      expect(result.status).toBe("CONFLICTING_DNS");
    });

    it("returns VALID when domain is verified and configured", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: true });
      mockDomainManager.getConfigStatus.mockResolvedValue({ configured: true });

      const result = await service.verifyDomainStatus(1);

      expect(result.status).toBe("VALID");
    });

    it("triggers verification when domain not yet verified and returns PENDING", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: false });
      mockDomainManager.getConfigStatus.mockResolvedValue({ configured: true });
      mockDomainManager.triggerVerification.mockResolvedValue({ verified: false });

      const result = await service.verifyDomainStatus(1);

      expect(mockDomainManager.triggerVerification).toHaveBeenCalledWith("app.example.com");
      expect(result.status).toBe("PENDING");
    });

    it("returns VALID after successful verification attempt", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: false });
      mockDomainManager.getConfigStatus.mockResolvedValue({ configured: true });
      mockDomainManager.triggerVerification.mockResolvedValue({ verified: true });

      const result = await service.verifyDomainStatus(1);

      expect(result.status).toBe("VALID");
    });

    it("updates verification status in DB when it changes", async () => {
      const unverifiedDomain = { ...mockDomain, verified: false };
      mockRepo.findByTeamId.mockResolvedValue(unverifiedDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: true });
      mockDomainManager.getConfigStatus.mockResolvedValue({ configured: true });

      await service.verifyDomainStatus(1);

      expect(mockRepo.updateVerificationStatus).toHaveBeenCalledWith("domain-1", true);
    });

    it("does not update DB when verification status is unchanged", async () => {
      const verifiedDomain = { ...mockDomain, verified: true };
      mockRepo.findByTeamId.mockResolvedValue(verifiedDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: true });
      mockDomainManager.getConfigStatus.mockResolvedValue({ configured: true });

      await service.verifyDomainStatus(1);

      expect(mockRepo.updateVerificationStatus).not.toHaveBeenCalled();
    });

    it("updates DB from verified to unverified when provider returns null", async () => {
      const verifiedDomain = { ...mockDomain, verified: true };
      mockRepo.findByTeamId.mockResolvedValue(verifiedDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue(null);

      await service.verifyDomainStatus(1);

      expect(mockRepo.updateVerificationStatus).toHaveBeenCalledWith("domain-1", false);
    });

    it("does not treat empty conflicts array as CONFLICTING_DNS", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: true });
      mockDomainManager.getConfigStatus.mockResolvedValue({ configured: true, conflicts: [] });

      const result = await service.verifyDomainStatus(1);

      expect(result.status).toBe("VALID");
    });

    it("propagates errors when provider API throws during getDomainInfo", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockRejectedValue(new Error("Provider API unreachable"));

      await expect(service.verifyDomainStatus(1)).rejects.toThrow("Provider API unreachable");
      expect(mockRepo.updateVerificationStatus).not.toHaveBeenCalled();
    });

    it("only returns status and domain in public result", async () => {
      mockRepo.findByTeamId.mockResolvedValue(mockDomain);
      mockDomainManager.getDomainInfo.mockResolvedValue({ verified: true });
      mockDomainManager.getConfigStatus.mockResolvedValue({ configured: true });

      const result = await service.verifyDomainStatus(1);

      expect(result).toEqual({ status: "VALID" });
      expect(Object.keys(result)).toEqual(["status"]);
    });
  });

  describe("checkAvailability", () => {
    it("normalizes slug before checking", async () => {
      mockRepo.existsBySlug.mockResolvedValue(false);

      await service.checkAvailability("  APP.Example.COM  ");

      expect(mockRepo.existsBySlug).toHaveBeenCalledWith("app.example.com");
    });
  });
});
