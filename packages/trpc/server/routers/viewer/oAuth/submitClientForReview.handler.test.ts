import type { PrismaClient } from "@calcom/prisma";
import type { TFunction } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitClientForReviewHandler } from "./submitClientForReview.handler";

const mocks = vi.hoisted(() => {
  return {
    createOAuthClient: vi.fn(),
    sendAdminOAuthClientNotification: vi.fn(),
    getTranslation: vi.fn(),
    generateSecret: vi.fn(),
    checkIfFreeEmailDomain: vi.fn(),
  };
});

vi.mock("@calcom/features/oauth/repositories/OAuthClientRepository", () => ({
  OAuthClientRepository: class {
    constructor() {}
    create = mocks.createOAuthClient;
  },
}));

vi.mock("@calcom/emails/oauth-email-service", () => ({
  sendAdminOAuthClientNotification: mocks.sendAdminOAuthClientNotification,
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: mocks.getTranslation,
}));

vi.mock("@calcom/features/oauth/utils/generateSecret", () => ({
  generateSecret: mocks.generateSecret,
}));

vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: mocks.checkIfFreeEmailDomain,
}));

describe("submitClientHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws an error when user has a free email domain", async () => {
    mocks.checkIfFreeEmailDomain.mockResolvedValue(true);

    const ctx = {
      user: {
        id: 42,
        email: "submitter@gmail.com",
        name: "Submitter Name",
      },
      prisma: {} as unknown as PrismaClient,
    };

    const input = {
      name: "My Test Client",
      purpose: "My test purpose",
      redirectUri: "https://example.com/callback",
      logo: "https://example.com/logo.png",
      websiteUrl: "https://example.com",
      enablePkce: false,
    };

    await expect(submitClientForReviewHandler({ ctx, input })).rejects.toThrow("Use a company email instead");

    expect(mocks.checkIfFreeEmailDomain).toHaveBeenCalledWith({ email: "submitter@gmail.com" });
    expect(mocks.createOAuthClient).not.toHaveBeenCalled();
    expect(mocks.sendAdminOAuthClientNotification).not.toHaveBeenCalled();
  });

  it("creates an OAuth client and sends the admin notification email with expected parameters", async () => {
    mocks.checkIfFreeEmailDomain.mockResolvedValue(false);
    const t = ((key: string, vars?: Record<string, unknown>) => {
      if (key === "admin_oauth_notification_email_subject") {
        return `admin_oauth_notification_email_subject:${String(vars?.clientName ?? "")}`;
      }
      return key;
    }) as unknown as TFunction;

    mocks.getTranslation.mockResolvedValue(t);
    mocks.generateSecret.mockReturnValue(["hashed-secret", "plain-secret"]);

    const createdClient = {
      clientId: "client_123",
      name: "My Test Client",
      purpose: "My test purpose",
      redirectUri: "https://example.com/callback",
      logo: "https://example.com/logo.png",
      clientType: "CONFIDENTIAL",
      clientSecret: "hashed-secret",
      isPkceEnabled: false,
      status: "PENDING",
    };

    mocks.createOAuthClient.mockResolvedValue(createdClient);
    mocks.sendAdminOAuthClientNotification.mockResolvedValue({});

    const ctx = {
      user: {
        id: 42,
        email: "submitter@example.com",
        name: "Submitter Name",
      },
      prisma: {} as unknown as PrismaClient,
    };

    const input = {
      name: createdClient.name,
      purpose: createdClient.purpose,
      redirectUri: createdClient.redirectUri,
      logo: createdClient.logo,
      websiteUrl: "https://example.com",
      enablePkce: false,
    };

    const result = await submitClientForReviewHandler({ ctx, input });

    expect(mocks.createOAuthClient).toHaveBeenCalledWith({
      name: input.name,
      purpose: input.purpose,
      redirectUri: input.redirectUri,
      clientSecret: "hashed-secret",
      logo: input.logo,
      websiteUrl: input.websiteUrl,
      enablePkce: input.enablePkce,
      userId: ctx.user.id,
      status: "PENDING",
    });

    expect(mocks.sendAdminOAuthClientNotification).toHaveBeenCalledWith({
      t,
      clientName: createdClient.name,
      purpose: createdClient.purpose,
      clientId: createdClient.clientId,
      redirectUri: createdClient.redirectUri,
      submitterEmail: ctx.user.email,
      submitterName: ctx.user.name,
    });

    expect(result).toEqual({
      clientId: createdClient.clientId,
      name: createdClient.name,
      purpose: createdClient.purpose,
      clientSecret: "plain-secret",
      redirectUri: createdClient.redirectUri,
      logo: createdClient.logo,
      clientType: createdClient.clientType,
      status: createdClient.status,
      isPkceEnabled: input.enablePkce,
    });
  });
});
