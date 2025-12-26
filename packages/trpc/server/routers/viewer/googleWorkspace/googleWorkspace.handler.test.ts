import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TrpcSessionUser } from "../../../types";

// Mock prisma
vi.mock("@calcom/prisma", () => ({
  prisma: {
    credential: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock getAppKeysFromSlug
vi.mock("@calcom/app-store/_utils/getAppKeysFromSlug", () => ({
  default: vi.fn(),
}));

// Factory function to create mock user context
const createMockContext = (overrides: Partial<TrpcSessionUser> = {}) => ({
  ctx: {
    user: {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      ...overrides,
    } as NonNullable<TrpcSessionUser>,
  },
});

// Factory function to create mock credential matching Prisma's Credential model
const createMockCredential = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  type: "google_workspace_directory",
  key: {
    refresh_token: "mock_refresh_token",
    access_token: "mock_access_token",
  },
  userId: 1,
  teamId: null,
  appId: null,
  subscriptionId: null,
  paymentStatus: null,
  billingCycleStart: null,
  invalid: false,
  delegationCredentialId: null,
  ...overrides,
});

describe("googleWorkspace.handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkForGWorkspace", () => {
    it("queries credentials filtered by current user id", async () => {
      const { prisma } = await import("@calcom/prisma");
      const { checkForGWorkspace } = await import("./googleWorkspace.handler");

      const mockContext = createMockContext({ id: 42 });
      vi.mocked(prisma.credential.findFirst).mockResolvedValue(null);

      await checkForGWorkspace(mockContext);

      expect(prisma.credential.findFirst).toHaveBeenCalledWith({
        where: {
          type: "google_workspace_directory",
          userId: 42,
        },
      });
    });

    it("returns credential id when found", async () => {
      const { prisma } = await import("@calcom/prisma");
      const { checkForGWorkspace } = await import("./googleWorkspace.handler");

      const mockCredential = createMockCredential({ id: 123 });
      vi.mocked(prisma.credential.findFirst).mockResolvedValue(mockCredential);

      const result = await checkForGWorkspace(createMockContext());

      expect(result).toEqual({ id: 123 });
    });

    it("returns undefined id when no credential found", async () => {
      const { prisma } = await import("@calcom/prisma");
      const { checkForGWorkspace } = await import("./googleWorkspace.handler");

      vi.mocked(prisma.credential.findFirst).mockResolvedValue(null);

      const result = await checkForGWorkspace(createMockContext());

      expect(result).toEqual({ id: undefined });
    });
  });

  describe("getUsersFromGWorkspace", () => {
    it("queries credentials filtered by current user id", async () => {
      const { prisma } = await import("@calcom/prisma");
      const getAppKeysFromSlug = (await import("@calcom/app-store/_utils/getAppKeysFromSlug")).default;
      const { getUsersFromGWorkspace } = await import("./googleWorkspace.handler");

      const mockContext = createMockContext({ id: 99 });

      vi.mocked(getAppKeysFromSlug).mockResolvedValue({
        client_id: "mock_client_id",
        client_secret: "mock_client_secret",
      });
      vi.mocked(prisma.credential.findFirst).mockResolvedValue(null);

      await expect(getUsersFromGWorkspace(mockContext)).rejects.toThrow("No workspace credentials found");

      expect(prisma.credential.findFirst).toHaveBeenCalledWith({
        where: {
          type: "google_workspace_directory",
          userId: 99,
        },
      });
    });

    it("throws error when Google client_id is missing", async () => {
      const getAppKeysFromSlug = (await import("@calcom/app-store/_utils/getAppKeysFromSlug")).default;
      const { getUsersFromGWorkspace } = await import("./googleWorkspace.handler");

      vi.mocked(getAppKeysFromSlug).mockResolvedValue({});

      await expect(getUsersFromGWorkspace(createMockContext())).rejects.toThrow("Google client_id missing.");
    });

    it("throws error when no credentials found for user", async () => {
      const { prisma } = await import("@calcom/prisma");
      const getAppKeysFromSlug = (await import("@calcom/app-store/_utils/getAppKeysFromSlug")).default;
      const { getUsersFromGWorkspace } = await import("./googleWorkspace.handler");

      vi.mocked(getAppKeysFromSlug).mockResolvedValue({
        client_id: "mock_client_id",
        client_secret: "mock_client_secret",
      });
      vi.mocked(prisma.credential.findFirst).mockResolvedValue(null);

      await expect(getUsersFromGWorkspace(createMockContext())).rejects.toThrow(
        "No workspace credentials found"
      );
    });

  });

  describe("removeCurrentGoogleWorkspaceConnection", () => {
    it("deletes credentials filtered by current user id", async () => {
      const { prisma } = await import("@calcom/prisma");
      const { removeCurrentGoogleWorkspaceConnection } = await import("./googleWorkspace.handler");

      const mockContext = createMockContext({ id: 55 });
      vi.mocked(prisma.credential.deleteMany).mockResolvedValue({ count: 1 });

      await removeCurrentGoogleWorkspaceConnection(mockContext);

      expect(prisma.credential.deleteMany).toHaveBeenCalledWith({
        where: {
          type: "google_workspace_directory",
          userId: 55,
        },
      });
    });

    it("returns count of deleted credentials", async () => {
      const { prisma } = await import("@calcom/prisma");
      const { removeCurrentGoogleWorkspaceConnection } = await import("./googleWorkspace.handler");

      vi.mocked(prisma.credential.deleteMany).mockResolvedValue({ count: 2 });

      const result = await removeCurrentGoogleWorkspaceConnection(createMockContext());

      expect(result).toEqual({ deleted: 2 });
    });
  });
});
