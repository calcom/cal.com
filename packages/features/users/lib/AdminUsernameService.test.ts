import { describe, expect, it, vi, beforeEach } from "vitest";

import { RedirectType } from "@calcom/prisma/enums";

import { AdminUsernameService } from "./AdminUsernameService";

vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ info: vi.fn(), error: vi.fn() }) },
}));

function makePrisma() {
  const prisma = {
    profile: {
      findMany: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue({}),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    tempOrgRedirect: {
      findMany: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  } as unknown as Parameters<typeof AdminUsernameService.prototype.preview>[0] extends string
    ? never
    : ConstructorParameters<typeof AdminUsernameService>[0];
  return prisma;
}

describe("AdminUsernameService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: AdminUsernameService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AdminUsernameService(prisma);
  });

  describe("preview", () => {
    it("returns no blocking records when username is free", async () => {
      const result = await service.preview("freeuser", null);

      expect(result).toEqual({
        mode: "preview",
        username: "freeuser",
        organizationId: null,
        blockingRecords: [],
        canRelease: false,
      });
    });

    it("finds blocking user records without org", async () => {
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 10, email: "taken@example.com", organizationId: null },
      ]);

      const result = await service.preview("taken", null);

      expect(result.blockingRecords).toHaveLength(1);
      expect(result.blockingRecords[0]).toEqual({
        type: "user",
        id: 10,
        detail: "User #10 (taken@example.com, orgId: none)",
      });
      expect(result.canRelease).toBe(true);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { username: "taken", organizationId: null },
        select: { id: true, email: true, organizationId: true },
      });
    });

    it("finds blocking profile records when organizationId is provided", async () => {
      (prisma.profile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 5, userId: 20, organizationId: 100 },
      ]);

      const result = await service.preview("orguser", 100);

      expect(result.blockingRecords).toContainEqual({
        type: "profile",
        id: 5,
        detail: "Profile #5 (userId: 20, orgId: 100)",
      });
      expect(result.canRelease).toBe(true);

      expect(prisma.profile.findMany).toHaveBeenCalledWith({
        where: { username: "orguser", organizationId: 100 },
        select: { id: true, userId: true, organizationId: true },
      });
    });

    it("does not query profiles when organizationId is null", async () => {
      await service.preview("someuser", null);

      expect(prisma.profile.findMany).not.toHaveBeenCalled();
    });

    it("finds blocking tempOrgRedirect records without org", async () => {
      (prisma.tempOrgRedirect.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 42, fromOrgId: 0, toUrl: "https://cal.com/org/user" },
      ]);

      const result = await service.preview("redirected", null);

      expect(result.blockingRecords).toContainEqual({
        type: "tempOrgRedirect",
        id: 42,
        detail: "TempOrgRedirect #42 (fromOrgId: 0, toUrl: https://cal.com/org/user)",
      });

      expect(prisma.tempOrgRedirect.findMany).toHaveBeenCalledWith({
        where: { from: "redirected", type: RedirectType.User, fromOrgId: 0 },
        select: { id: true, fromOrgId: true, toUrl: true },
      });
    });

    it("queries tempOrgRedirect without fromOrgId filter when organizationId is provided", async () => {
      await service.preview("orguser", 100);

      expect(prisma.tempOrgRedirect.findMany).toHaveBeenCalledWith({
        where: { from: "orguser", type: RedirectType.User },
        select: { id: true, fromOrgId: true, toUrl: true },
      });
    });

    it("aggregates records from all sources", async () => {
      (prisma.profile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, userId: 10, organizationId: 50 },
      ]);
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 20, email: "u@test.com", organizationId: 50 },
      ]);
      (prisma.tempOrgRedirect.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 30, fromOrgId: 0, toUrl: "/redirect" },
      ]);

      const result = await service.preview("multi", 50);

      expect(result.blockingRecords).toHaveLength(3);
      expect(result.blockingRecords.map((r) => r.type)).toEqual(["profile", "user", "tempOrgRedirect"]);
      expect(result.canRelease).toBe(true);
    });
  });

  describe("execute", () => {
    it("returns released false when no blocking records exist", async () => {
      const result = await service.execute("freeuser", null);

      expect(result).toEqual({
        mode: "execute",
        released: false,
        deletedRecords: [],
      });
      expect(prisma.profile.delete).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.tempOrgRedirect.delete).not.toHaveBeenCalled();
    });

    it("deletes profile records", async () => {
      (prisma.profile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 5, userId: 20, organizationId: 100 },
      ]);

      const result = await service.execute("orguser", 100);

      expect(result.released).toBe(true);
      expect(result.deletedRecords).toHaveLength(1);
      expect(result.deletedRecords[0].type).toBe("profile");
      expect(prisma.profile.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it("nulls out username on user records instead of deleting", async () => {
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 10, email: "user@test.com", organizationId: null },
      ]);

      const result = await service.execute("taken", null);

      expect(result.released).toBe(true);
      expect(result.deletedRecords[0].type).toBe("user");
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { username: null },
        select: { id: true },
      });
    });

    it("deletes tempOrgRedirect records", async () => {
      (prisma.tempOrgRedirect.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 42, fromOrgId: 0, toUrl: "/redirect" },
      ]);

      const result = await service.execute("redirected", null);

      expect(result.released).toBe(true);
      expect(result.deletedRecords[0].type).toBe("tempOrgRedirect");
      expect(prisma.tempOrgRedirect.delete).toHaveBeenCalledWith({ where: { id: 42 } });
    });

    it("processes all record types in a single execution", async () => {
      (prisma.profile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, userId: 10, organizationId: 50 },
      ]);
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 20, email: "u@test.com", organizationId: 50 },
      ]);
      (prisma.tempOrgRedirect.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 30, fromOrgId: 0, toUrl: "/redirect" },
      ]);

      const result = await service.execute("multi", 50);

      expect(result.released).toBe(true);
      expect(result.deletedRecords).toHaveLength(3);
      expect(prisma.profile.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { username: null },
        select: { id: true },
      });
      expect(prisma.tempOrgRedirect.delete).toHaveBeenCalledWith({ where: { id: 30 } });
    });

    it("handles multiple records of the same type", async () => {
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 10, email: "a@test.com", organizationId: null },
        { id: 11, email: "b@test.com", organizationId: null },
      ]);

      const result = await service.execute("duplicate", null);

      expect(result.released).toBe(true);
      expect(result.deletedRecords).toHaveLength(2);
      expect(prisma.user.update).toHaveBeenCalledTimes(2);
    });
  });
});
