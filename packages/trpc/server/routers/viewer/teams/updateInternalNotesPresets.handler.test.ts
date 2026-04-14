import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import { updateInternalNotesPresetsHandler } from "./updateInternalNotesPresets.handler";
import type { TUpdateInternalNotesPresetsInputSchema } from "./updateInternalNotesPresets.schema";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    internalNotePreset: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      meta: unknown;
      constructor(message: string, options: { code: string; clientVersion: string; meta?: unknown }) {
        super(message);
        this.name = "PrismaClientKnownRequestError";
        this.code = options.code;
        this.meta = options.meta;
      }
    },
  },
}));

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn().mockImplementation(function () {
    return {
      checkPermission: vi.fn(),
    };
  }),
}));

describe("updateInternalNotesPresetsHandler", () => {
  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(function () {
      return mockPermissionCheckService as unknown as InstanceType<typeof PermissionCheckService>;
    });
  });

  describe("Permission Check", () => {
    const user: NonNullable<TrpcSessionUser> = {
      id: 1,
      organization: { isOrgAdmin: false },
    } as NonNullable<TrpcSessionUser>;

    it("should throw UNAUTHORIZED when permission check fails", async () => {
      const input: TUpdateInternalNotesPresetsInputSchema = {
        teamId: 50,
        presets: [{ id: -1, name: "New Preset" }],
      };

      mockPermissionCheckService.checkPermission.mockResolvedValue(false);

      await expect(
        updateInternalNotesPresetsHandler({
          ctx: { user },
          input,
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      expect(prisma.internalNotePreset.findMany).not.toHaveBeenCalled();
    });

    it("should allow access when permission check passes", async () => {
      const input: TUpdateInternalNotesPresetsInputSchema = {
        teamId: 50,
        presets: [{ id: -1, name: "New Preset" }],
      };

      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      vi.mocked(prisma.internalNotePreset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.internalNotePreset.create).mockResolvedValue({
        id: 1,
        name: "New Preset",
        teamId: 50,
        createdAt: new Date(),
        cancellationReason: null,
      });

      const result = await updateInternalNotesPresetsHandler({
        ctx: { user },
        input,
      });

      expect(result).toHaveLength(1);
      expect(prisma.internalNotePreset.create).toHaveBeenCalled();
    });
  });

  describe("Org Admin Bypass", () => {
    const orgAdminUser: NonNullable<TrpcSessionUser> = {
      id: 1,
      organization: { isOrgAdmin: true },
    } as NonNullable<TrpcSessionUser>;

    it("should bypass permission check for org admins", async () => {
      const input: TUpdateInternalNotesPresetsInputSchema = {
        teamId: 50,
        presets: [{ id: -1, name: "New Preset" }],
      };

      vi.mocked(prisma.internalNotePreset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.internalNotePreset.create).mockResolvedValue({
        id: 1,
        name: "New Preset",
        teamId: 50,
        createdAt: new Date(),
        cancellationReason: null,
      });

      const result = await updateInternalNotesPresetsHandler({
        ctx: { user: orgAdminUser },
        input,
      });

      expect(result).toHaveLength(1);
      expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
    });
  });

  describe("Duplicate Constraint", () => {
    const user: NonNullable<TrpcSessionUser> = {
      id: 1,
      organization: { isOrgAdmin: true },
    } as NonNullable<TrpcSessionUser>;

    it("should throw CONFLICT when duplicate preset exists", async () => {
      const input: TUpdateInternalNotesPresetsInputSchema = {
        teamId: 50,
        presets: [{ id: -1, name: "Duplicate Preset" }],
      };

      const duplicateError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "1.0.0",
      });

      vi.mocked(prisma.internalNotePreset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.internalNotePreset.create).mockRejectedValue(duplicateError);

      await expect(
        updateInternalNotesPresetsHandler({
          ctx: { user },
          input,
        })
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "A preset with this name already exists. Please try a different name.",
      });
    });

    it("should re-throw non-P2002 errors", async () => {
      const input: TUpdateInternalNotesPresetsInputSchema = {
        teamId: 50,
        presets: [{ id: -1, name: "New Preset" }],
      };

      const genericError = new Prisma.PrismaClientKnownRequestError("Some other error", {
        code: "P5000",
        clientVersion: "1.0.0",
      });

      vi.mocked(prisma.internalNotePreset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.internalNotePreset.create).mockRejectedValue(genericError);

      await expect(
        updateInternalNotesPresetsHandler({
          ctx: { user },
          input,
        })
      ).rejects.toThrow("Some other error");
    });
  });

  describe("CRUD Operations", () => {
    const user: NonNullable<TrpcSessionUser> = {
      id: 1,
      organization: { isOrgAdmin: true },
    } as NonNullable<TrpcSessionUser>;

    it("should update existing presets when id is provided", async () => {
      const input: TUpdateInternalNotesPresetsInputSchema = {
        teamId: 50,
        presets: [{ id: 1, name: "Updated Preset", cancellationReason: "Updated Reason" }],
      };

      vi.mocked(prisma.internalNotePreset.findMany).mockResolvedValue([{ id: 1, cancellationReason: '', createdAt: new Date(), name: '', teamId: 1 }]);
      vi.mocked(prisma.internalNotePreset.update).mockResolvedValue({
        id: 1,
        name: "Updated Preset",
        teamId: 50,
        createdAt: new Date('2025-05-05'),
        cancellationReason: "Updated Reason",
      });

      const result = await updateInternalNotesPresetsHandler({
        ctx: { user },
        input,
      });

      expect(result).toHaveLength(1);
      expect(prisma.internalNotePreset.update).toHaveBeenCalledWith({
        where: { id: 1, teamId: 50 },
        data: { name: "Updated Preset", cancellationReason: "Updated Reason" },
      });
    });

    it("should delete presets not in the update", async () => {
      const input: TUpdateInternalNotesPresetsInputSchema = {
        teamId: 50,
        presets: [{ id: 1, name: "Keep Preset" }],
      };

      vi.mocked(prisma.internalNotePreset.findMany).mockResolvedValue([{ id: 1, cancellationReason: '', createdAt: new Date(), name: 'a', teamId: 1 }, { id: 2, cancellationReason: '', createdAt: new Date(), name: 'b', teamId: 1 }, { id: 3, cancellationReason: '', createdAt: new Date(), name: 'c', teamId: 1 }]);
      vi.mocked(prisma.internalNotePreset.deleteMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.internalNotePreset.update).mockResolvedValue({
        id: 1,
        name: "Keep Preset",
        teamId: 50,
        createdAt: new Date('2025-05-05'),
        cancellationReason: null,
      });

      const result = await updateInternalNotesPresetsHandler({
        ctx: { user },
        input,
      });

      expect(result).toHaveLength(1);
      expect(prisma.internalNotePreset.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [2, 3] }, teamId: 50 },
      });
    });
  });
});
