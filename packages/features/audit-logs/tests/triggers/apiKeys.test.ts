import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { faker } from "@faker-js/faker";
import { createMocks } from "node-mocks-http";
import { vi, describe, test, expect } from "vitest";

import { verifyApiKey } from "@calcom/api/lib/helpers/verifyApiKey";
import { isAdminGuard } from "@calcom/api/lib/utils/isAdmin";
import { ScopeOfAdmin } from "@calcom/api/lib/utils/scopeOfAdmin";
import type {
  CustomNextApiRequest,
  CustomNextApiResponse,
} from "@calcom/api/test/lib/middleware/verifyApiKey.test";
import { generateUniqueAPIKey } from "@calcom/ee/api-keys/lib/apiKeys";
import checkLicense from "@calcom/features/ee/common/server/checkLicense";
import { buildCredential } from "@calcom/lib/test/builder";
import prisma from "@calcom/prisma";
import { IdentityProvider, AuditLogApiKeysTriggerEvents, MembershipRole } from "@calcom/prisma/enums";
import { buildMockData } from "@calcom/trpc/lib/tests";
import { createHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/create.handler";
import { deleteHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/delete.handler";
import { editHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/edit.handler";

import { handleAuditLogTrigger } from "../../lib/handleAuditLogTrigger";

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

// const mockReportEventGeneric = vi.fn();
// vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
//   getGenericAuditLogClient: vi.fn().mockImplementation(() => {
//     return {
//       reportEvent: mockReportEventGeneric,
//     };
//   }),
// }));

describe("handleAuditLogTrigger", () => {
  test("API_KEY_CREATED is reported as expected.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }),
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

    const result = await createHandler({
      ctx: { user },
      input: {
        note: "API Key used by x.",
        expiresAt: null,
        neverExpires: true,
        teamId: team.id,
        appId: null,
      },
    });

    await handleAuditLogTrigger({
      trigger: "create",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: result.data,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_CREATED,
      })
    );
  });

  test("API_KEY_DELETED is reported as expected.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }),
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

    const [hashedApiKey] = generateUniqueAPIKey();
    const createdKey = await prismock.apiKey.create({
      data: {
        id: faker.datatype.uuid(),
        userId: user.id,
        teamId: team.id,
        note: "API Key used by x.",
        expiresAt: null,
        neverExpires: true,
        appId: null,
        // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
        hashedKey: hashedApiKey,
      },
    });

    const result = await deleteHandler({
      ctx: { user },
      input: {
        id: createdKey.id,
      },
    });

    await handleAuditLogTrigger({
      trigger: "delete",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: result.data,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_DELETED,
      })
    );
  });

  test("API_KEY_UPDATED is reported as expected.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }),
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

    const [hashedApiKey] = generateUniqueAPIKey();
    const createdKey = await prismock.apiKey.create({
      data: {
        id: faker.datatype.uuid(),
        userId: user.id,
        teamId: team.id,
        note: "API Key used by x.",
        expiresAt: null,
        neverExpires: true,
        appId: null,
        // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
        hashedKey: hashedApiKey,
      },
    });

    const result = await editHandler({
      ctx: { user },
      input: {
        id: createdKey.id,
        note: "Note Updated",
      },
    });

    await handleAuditLogTrigger({
      trigger: "edit",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: result.data,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_UPDATED,
      })
    );
  });

  test("API_KEY_USED is reported as expected.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        appId: "genericImplementation",
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }),
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
        neverExpires: true,
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
      prisma,
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
