import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { faker } from "@faker-js/faker";
import type { Credential, Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { vi, describe, test, expect } from "vitest";

import { generateUniqueAPIKey } from "@calcom/ee/api-keys/lib/apiKeys";
import checkLicense from "@calcom/features/ee/common/server/checkLicense";
import { buildCredential } from "@calcom/lib/test/builder";
import { AuditLogApiKeysTriggerEvents, MembershipRole } from "@calcom/prisma/enums";

import { verifyApiKey } from "../../../../../../apps/api/v1/lib/helpers/verifyApiKey";
import { isAdminGuard } from "../../../../../../apps/api/v1/lib/utils/isAdmin";
import { ScopeOfAdmin } from "../../../../../../apps/api/v1/lib/utils/scopeOfAdmin";

vi.mock("@calcom/features/ee/common/server/checkLicense", () => {
  return {
    default: vi.fn(),
  };
});

vi.mock("@calcom/api/lib/utils/isAdmin", () => {
  return {
    isAdminGuard: vi.fn(),
  };
});

const mockReportEvent = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getAuditLogManager", () => {
  return {
    getAuditLogManager: vi.fn().mockImplementation(() => {
      return {
        reportEvent: mockReportEvent,
      };
    }),
  };
});

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;
const mockReportEventGeneric = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
  getGenericAuditLogClient: vi.fn().mockImplementation(() => {
    return {
      reportEvent: mockReportEventGeneric,
    };
  }),
}));

describe("handleAuditLogTrigger", () => {
  test("API_KEY_USED is reported as expected.", async () => {
    const user = await prismock.user.create({
      data: {
        id: 1,
        username: "test",
        name: "Test User",
        email: "test@example.com",
        role: "ADMIN",
      },
    });

    await prismock.credential.create({
      data: buildCredential({
        userId: user.id,
        appId: "genericImplementation",
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
    });

    const team = await prismock.team.create({
      data: {
        slug: "temporary_team",
        name: "temporary_team",
        members: {
          create: {
            userId: user.id,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
    });

    const [hashedApiKey, apiKey] = generateUniqueAPIKey();
    await prismock.apiKey.create({
      data: {
        id: faker.datatype.uuid(),
        userId: user.id,
        teamId: team.id,
        note: "API Key used by x.",
        expiresAt: null,
        appId: null,
        // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
        hashedKey: hashedApiKey,
      },
    });

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
      query: {
        apiKey,
      },
      prisma: prismock,
      url: "/apiKeys?apiKey=cal_123123123",
    });

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(checkLicense).mockResolvedValue(true);
    vi.mocked(isAdminGuard).mockResolvedValue({ isAdmin: true, scope: ScopeOfAdmin.SystemWide, user });

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();
    expect(req.isSystemWideAdmin).toBe(true);
    expect(req.isOrganizationOwnerOrAdmin).toBe(false);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_USED,
        fields: expect.objectContaining({
          "apiKey.note": "API Key used by x.",
          "apiKey.apiEndpoint.url": "/apiKeys",
          "apiKey.apiEndpoint.method": "POST",
        }),
      })
    );
  });
});
