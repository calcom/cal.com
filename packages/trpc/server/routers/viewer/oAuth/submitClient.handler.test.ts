import { describe, expect, it, vi, beforeEach } from "vitest";

import type { TFunction } from "i18next";

import type { PrismaClient } from "@calcom/prisma";

import { submitClientHandler } from "./submitClient.handler";

const mocks = vi.hoisted(() => {
  return {
    createOAuthClient: vi.fn(),
    sendAdminOAuthClientNotification: vi.fn(),
    getTranslation: vi.fn(),
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

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: mocks.getTranslation,
}));

describe("submitClientHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an OAuth client and sends the admin notification email with expected parameters", async () => {
    const t = ((key: string, vars?: Record<string, unknown>) => {
      if (key === "admin_oauth_notification_email_subject") {
        return `admin_oauth_notification_email_subject:${String(vars?.clientName ?? "")}`;
      }
      return key;
    }) as unknown as TFunction;

    mocks.getTranslation.mockResolvedValue(t);

    const createdClient = {
      clientId: "client_123",
      name: "My Test Client",
      purpose: "My test purpose",
      redirectUri: "https://example.com/callback",
      logo: "https://example.com/logo.png",
      clientType: "CONFIDENTIAL",
      clientSecret: "plain-secret",
      isPkceEnabled: false,
      approvalStatus: "PENDING",
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

    const result = await submitClientHandler({ ctx, input });

    expect(mocks.createOAuthClient).toHaveBeenCalledWith({
      name: input.name,
      purpose: input.purpose,
      redirectUri: input.redirectUri,
      logo: input.logo,
      websiteUrl: input.websiteUrl,
      enablePkce: input.enablePkce,
      userId: ctx.user.id,
      approvalStatus: "PENDING",
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
      clientSecret: createdClient.clientSecret,
      redirectUri: createdClient.redirectUri,
      logo: createdClient.logo,
      clientType: createdClient.clientType,
      approvalStatus: createdClient.approvalStatus,
      isPkceEnabled: input.enablePkce,
    });
  });
});
