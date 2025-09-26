import { describe, expect, it, vi, beforeEach } from "vitest";

import { PBACRemoveMemberService } from "../PBACRemoveMemberService";
import { RemoveMemberServiceFactory } from "../RemoveMemberServiceFactory";

vi.mock("../PBACRemoveMemberService");

describe("RemoveMemberServiceFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Service Creation", () => {
    it("should always create PBACRemoveMemberService", async () => {
      const teamId = 1;
      const service = await RemoveMemberServiceFactory.create(teamId);

      expect(service).toBeInstanceOf(PBACRemoveMemberService);
    });
  });

  describe("Multiple Team Support", () => {
    it("should create different service instances for different teams", async () => {
      const service1 = await RemoveMemberServiceFactory.create(1);
      const service2 = await RemoveMemberServiceFactory.create(2);

      expect(service1).toBeInstanceOf(PBACRemoveMemberService);
      expect(service2).toBeInstanceOf(PBACRemoveMemberService);
      expect(service1).not.toBe(service2);
    });

    it("should create service for each call (no caching in current implementation)", async () => {
      const teamId = 1;

      // Make multiple calls
      const service1 = await RemoveMemberServiceFactory.create(teamId);
      const service2 = await RemoveMemberServiceFactory.create(teamId);
      const service3 = await RemoveMemberServiceFactory.create(teamId);

      // All should be different instances (no caching currently)
      expect(service1).not.toBe(service2);
      expect(service2).not.toBe(service3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle service creation without errors", async () => {
      const service = await RemoveMemberServiceFactory.create(1);

      expect(service).toBeInstanceOf(PBACRemoveMemberService);
    });
  });
});
