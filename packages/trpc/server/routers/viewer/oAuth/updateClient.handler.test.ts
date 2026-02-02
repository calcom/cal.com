import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TFunction } from "i18next";

import type { PrismaClient } from "@calcom/prisma";
import { OAuthClientStatus, UserPermissionRole } from "@calcom/prisma/enums";

import { updateClientHandler } from "./updateClient.handler";

const mocks = vi.hoisted(() => {
  return {
    findByClientId: vi.fn(),
    findByClientIdIncludeUser: vi.fn(),
    sendOAuthClientApprovedNotification: vi.fn(),
    sendOAuthClientRejectedNotification: vi.fn(),
    getTranslation: vi.fn(),
  };
});

const CLIENT_ID = "client_123";
const OWNER_USER_ID = 42;

const USER_EMAIL = "admin@example.com";
const USER_NAME = "Admin Example";

const CLIENT_NAME = "My Client";
const CLIENT_PURPOSE = "My purpose";
const REDIRECT_URI = "https://example.com/callback";

const REJECTION_REASON_TRIMMED = "we dont support your usecase";
const REJECTION_REASON_RAW = "  we dont support your usecase ";

vi.mock("@calcom/features/oauth/repositories/OAuthClientRepository", () => ({
  OAuthClientRepository: class {
    constructor() {}
    findByClientId = mocks.findByClientId;
    findByClientIdIncludeUser = mocks.findByClientIdIncludeUser;
  },
}));

vi.mock("@calcom/emails/oauth-email-service", () => ({
  sendOAuthClientApprovedNotification: mocks.sendOAuthClientApprovedNotification,
  sendOAuthClientRejectedNotification: mocks.sendOAuthClientRejectedNotification,
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: mocks.getTranslation,
}));

describe("updateClientHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates status to APPROVED (admin) and sends approved notification email with expected parameters", async () => {
    const t = ((key: string, vars?: Record<string, unknown>) => {
      if (key === "oauth_client_approved_email_subject") {
        return `OAuth Client Approved: ${String(vars?.clientName ?? "")}`;
      }
      return key;
    }) as unknown as TFunction;

    mocks.getTranslation.mockResolvedValue(t);

    mocks.findByClientIdIncludeUser.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      status: "PENDING",
      user: {
        email: USER_EMAIL,
        name: USER_NAME,
      },
    });

    const prismaUpdate = vi.fn().mockResolvedValue({
      clientId: CLIENT_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      status: "APPROVED",
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      rejectionReason: null,
    });

    const ctx = {
      user: {
        id: 1,
        role: UserPermissionRole.ADMIN,
      },
      prisma: {
        oAuthClient: {
          update: prismaUpdate,
        },
      } as unknown as PrismaClient,
    };

    const input = {
      clientId: CLIENT_ID,
      status: OAuthClientStatus.APPROVED,
    };

    const result = await updateClientHandler({ ctx, input });

    expect(prismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: input.clientId },
        data: {
          status: "APPROVED",
          rejectionReason: null,
        },
      })
    );

    expect(mocks.getTranslation).toHaveBeenCalledWith("en", "common");

    expect(mocks.sendOAuthClientApprovedNotification).toHaveBeenCalledWith({
      t,
      userEmail: USER_EMAIL,
      userName: USER_NAME,
      clientName: CLIENT_NAME,
      clientId: CLIENT_ID,
    });

    expect(result).toEqual({
      clientId: CLIENT_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      status: "APPROVED",
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      rejectionReason: null,
    });
  });

  it("updates status to REJECTED (admin) and sends rejected notification email with trimmed rejection reason", async () => {
    const t = ((key: string, vars?: Record<string, unknown>) => {
      if (key === "oauth_client_rejected_email_subject") {
        return `OAuth Client Rejected: ${String(vars?.clientName ?? "")}`;
      }
      return key;
    }) as unknown as TFunction;

    mocks.getTranslation.mockResolvedValue(t);

    mocks.findByClientIdIncludeUser.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      status: "PENDING",
      user: {
        email: USER_EMAIL,
        name: USER_NAME,
      },
    });

    const prismaUpdate = vi.fn().mockResolvedValue({
      clientId: CLIENT_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      status: "REJECTED",
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      rejectionReason: REJECTION_REASON_TRIMMED,
    });

    const ctx = {
      user: {
        id: 1,
        role: UserPermissionRole.ADMIN,
      },
      prisma: {
        oAuthClient: {
          update: prismaUpdate,
        },
      } as unknown as PrismaClient,
    };

    const input = {
      clientId: CLIENT_ID,
      status: OAuthClientStatus.REJECTED,
      rejectionReason: REJECTION_REASON_RAW,
    };

    await updateClientHandler({ ctx, input });

    expect(prismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: input.clientId },
        data: {
          status: "REJECTED",
          rejectionReason: REJECTION_REASON_TRIMMED,
        },
      })
    );

    expect(mocks.getTranslation).toHaveBeenCalledWith("en", "common");

    expect(mocks.sendOAuthClientRejectedNotification).toHaveBeenCalledWith({
      t,
      userEmail: USER_EMAIL,
      userName: USER_NAME,
      clientName: CLIENT_NAME,
      clientId: CLIENT_ID,
      rejectionReason: REJECTION_REASON_TRIMMED,
    });
  });

  it("throws FORBIDDEN when a non-admin attempts to set rejectionReason", async () => {
    mocks.findByClientIdIncludeUser.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      status: "PENDING",
      user: null,
    });

    const ctx = {
      user: {
        id: 2,
        role: UserPermissionRole.USER,
      },
      prisma: {
        oAuthClient: {
          update: vi.fn(),
        },
      } as unknown as PrismaClient,
    };

    const input = {
      clientId: CLIENT_ID,
      rejectionReason: "nope",
    };

    await expect(updateClientHandler({ ctx, input })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only admins can set a rejection reason",
    });
  });

  it("throws BAD_REQUEST when rejecting without a non-empty rejectionReason", async () => {
    mocks.findByClientIdIncludeUser.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      status: "PENDING",
      user: null,
    });

    const ctx = {
      user: {
        id: 1,
        role: UserPermissionRole.ADMIN,
      },
      prisma: {
        oAuthClient: {
          update: vi.fn(),
        },
      } as unknown as PrismaClient,
    };

    await expect(
      updateClientHandler({
        ctx,
        input: {
          clientId: CLIENT_ID,
          status: OAuthClientStatus.REJECTED,
          rejectionReason: " ",
        },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Rejection reason is required",
    });
  });

  it("throws FORBIDDEN when a non-admin attempts to update status", async () => {
    mocks.findByClientIdIncludeUser.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      status: "PENDING",
      user: null,
    });

    const ctx = {
      user: {
        id: 2,
        role: UserPermissionRole.USER,
      },
      prisma: {
        oAuthClient: {
          update: vi.fn(),
        },
      } as unknown as PrismaClient,
    };

    await expect(
      updateClientHandler({
        ctx,
        input: {
          clientId: CLIENT_ID,
          status: OAuthClientStatus.APPROVED,
        },
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only admins can update OAuth client status",
    });
  });

  it("throws FORBIDDEN when a non-owner, non-admin attempts to update client fields", async () => {
    mocks.findByClientIdIncludeUser.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      status: "PENDING",
      user: null,
    });

    const ctx = {
      user: {
        id: 999,
        role: UserPermissionRole.USER,
      },
      prisma: {
        oAuthClient: {
          update: vi.fn(),
        },
      } as unknown as PrismaClient,
    };

    await expect(
      updateClientHandler({
        ctx,
        input: {
          clientId: CLIENT_ID,
          name: "New Name",
        },
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have permission to update this OAuth client",
    });
  });

  it("sets status to PENDING when an owner edits a previously approved client (reapproval flow)", async () => {
    mocks.findByClientIdIncludeUser.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      status: "APPROVED",
      user: null,
    });

    const prismaUpdate = vi.fn().mockResolvedValue({
      clientId: CLIENT_ID,
      name: "My Client v2",
      purpose: CLIENT_PURPOSE,
      status: "PENDING",
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      rejectionReason: null,
    });

    const ctx = {
      user: {
        id: 42,
        role: UserPermissionRole.USER,
      },
      prisma: {
        oAuthClient: {
          update: prismaUpdate,
        },
      } as unknown as PrismaClient,
    };

    await updateClientHandler({
      ctx,
      input: {
        clientId: CLIENT_ID,
        name: "My Client v2",
      },
    });

    expect(prismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: CLIENT_ID },
        data: {
          name: "My Client v2",
          status: "PENDING",
          rejectionReason: null,
        },
      })
    );

    expect(mocks.sendOAuthClientApprovedNotification).not.toHaveBeenCalled();
    expect(mocks.sendOAuthClientRejectedNotification).not.toHaveBeenCalled();
  });

  it("sets status to PENDING when an owner updates redirectUri (reapproval flow)", async () => {
    mocks.findByClientIdIncludeUser.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      redirectUri: REDIRECT_URI,
      websiteUrl: null,
      logo: null,
      status: "APPROVED",
      user: null,
    });

    const updatedRedirectUri = "https://example.com/new-callback";

    const prismaUpdate = vi.fn().mockResolvedValue({
      clientId: CLIENT_ID,
      name: CLIENT_NAME,
      purpose: CLIENT_PURPOSE,
      status: "PENDING",
      redirectUri: updatedRedirectUri,
      websiteUrl: null,
      logo: null,
      rejectionReason: null,
    });

    const ctx = {
      user: {
        id: OWNER_USER_ID,
        role: UserPermissionRole.USER,
      },
      prisma: {
        oAuthClient: {
          update: prismaUpdate,
        },
      } as unknown as PrismaClient,
    };

    await updateClientHandler({
      ctx,
      input: {
        clientId: CLIENT_ID,
        redirectUri: updatedRedirectUri,
      },
    });

    expect(prismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: CLIENT_ID },
        data: {
          redirectUri: updatedRedirectUri,
          status: "PENDING",
          rejectionReason: null,
        },
      })
    );
  });
});
