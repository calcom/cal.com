import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { faker } from "@faker-js/faker";
import type { Credential } from "@prisma/client";
import { vi, describe, test, expect } from "vitest";

import type { AppKeys } from "@calcom/app-store/templates/audit-log-implementation/zod";
import { generateUniqueAPIKey } from "@calcom/ee/api-keys/lib/apiKeys";
import { buildCredential, buildSession } from "@calcom/lib/test/builder";
import { IdentityProvider, AuditLogApiKeysTriggerEvents } from "@calcom/prisma/enums";
import type { inferProcedureInput } from "@calcom/trpc";
import { buildMockData } from "@calcom/trpc/lib/tests";
import { createContextInner } from "@calcom/trpc/server/createContext";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { apiKeyRouterCreateCaller } from "@calcom/trpc/server/routers/viewer/apiKeys/_router";

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

// const mockReportEvent = vi.fn();
// vi.mock("@calcom/features/audit-logs/lib/getAuditLogManager", () => {
//   return {
//     getAuditLogManager: vi.fn().mockImplementation(() => {
//       return {
//         reportEvent: mockReportEvent,
//       };
//     }),
//   };
// });

const mockReportEventGeneric = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
  getGenericAuditLogClient: vi.fn().mockImplementation(() => {
    return {
      reportEvent: mockReportEventGeneric,
    };
  }),
}));

describe("handleAuditLogTrigger", () => {
  test("API_KEY_CREATED is reported as expected.", async () => {
    const input: inferProcedureInput<AppRouter["viewer"]["apiKeys"]["create"]> = {};
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        userId: user.id,
        id: 0,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: AppKeys },
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });

    const caller = apiKeyRouterCreateCaller(ctx);
    await caller.create(input);

    expect(mockReportEventGeneric).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_CREATED,
      })
    );
  });

  test("API_KEY_DELETED is reported as expected.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        id: 0,
        userId: user.id,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: AppKeys },
    });

    const [hashedApiKey] = generateUniqueAPIKey();
    const createdKey = await prismock.apiKey.create({
      data: {
        id: faker.datatype.uuid(),
        userId: user.id,
        note: "API Key used by x.",
        expiresAt: null,
        appId: null,
        // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
        hashedKey: hashedApiKey,
      },
    });
    const input: inferProcedureInput<AppRouter["viewer"]["apiKeys"]["delete"]> = {
      id: createdKey.id,
    };
    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });
    const caller = apiKeyRouterCreateCaller(ctx);
    await caller.delete(input);

    expect(mockReportEventGeneric).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_DELETED,
      })
    );
  });

  test("API_KEY_UPDATED is reported as expected.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        id: 0,
        userId: user.id,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }),
    });

    const [hashedApiKey] = generateUniqueAPIKey();
    const createdKey = await prismock.apiKey.create({
      data: {
        id: faker.datatype.uuid(),
        userId: user.id,
        note: "API Key used by x.",
        expiresAt: null,
        neverExpires: true,
        appId: null,
        // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
        hashedKey: hashedApiKey,
      },
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });
    const caller = apiKeyRouterCreateCaller(ctx);
    const input: inferProcedureInput<AppRouter["viewer"]["apiKeys"]["delete"]> = {
      id: createdKey.id,
      note: "Note Updated",
    };
    await caller.edit(input);
    expect(mockReportEventGeneric).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_UPDATED,
      })
    );
  });

  // test("API_KEY_USED is reported as expected.", async () => {
  //   const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
  //   await prismock.credential.create({
  //     data: buildCredential({
  //       appId: "genericImplementation",
  //       key: {
  //         endpoint: "localhost:3000",
  //         projectId: "dev",
  //         apiKey: "",
  //         disabledEvents: [],
  //       },
  //     }),
  //   });

  //   const team = await prismock.team.create({
  //     data: {
  //       slug: "temporary_team",
  //       name: "temporary_team",
  //       members: {
  //         create: {
  //           userId: user.id,
  //           role: MembershipRole.OWNER,
  //           accepted: true,
  //         },
  //       },
  //     },
  //   });

  //   const [hashedApiKey, apiKey] = generateUniqueAPIKey();
  //   await prismock.apiKey.create({
  //     data: {
  //       id: faker.datatype.uuid(),
  //       userId: user.id,
  //       teamId: team.id,
  //       note: "API Key used by x.",
  //       expiresAt: null,
  //       neverExpires: true,
  //       appId: null,
  //       // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
  //       hashedKey: hashedApiKey,
  //     },
  //   });

  //   const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
  //     method: "POST",
  //     body: {},
  //     query: {
  //       apiKey,
  //     },
  //     prisma,
  //     url: "/apiKeys?apiKey=cal_123123123",
  //   });

  //   const middleware = {
  //     fn: verifyApiKey,
  //   };

  //   vi.mocked(checkLicense).mockResolvedValue(true);
  //   vi.mocked(isAdminGuard).mockResolvedValue({ isAdmin: true, scope: ScopeOfAdmin.SystemWide, user });

  //   const serverNext = vi.fn((next: void) => Promise.resolve(next));

  //   const middlewareSpy = vi.spyOn(middleware, "fn");

  //   await middleware.fn(req, res, serverNext);

  //   expect(middlewareSpy).toBeCalled();
  //   expect(req.isSystemWideAdmin).toBe(true);
  //   expect(req.isOrganizationOwnerOrAdmin).toBe(false);

  //   expect(mockReportEvent).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       action: AuditLogApiKeysTriggerEvents.API_KEY_USED,
  //       fields: expect.objectContaining({
  //         "apiKey.note": "API Key used by x.",
  //         "apiKey.apiEndpoint.url": "/apiKeys",
  //         "apiKey.apiEndpoint.method": "POST",
  //       }),
  //     })
  //   );
  // });
});
