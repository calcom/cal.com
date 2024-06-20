import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { faker } from "@faker-js/faker";
import type { Credential, Prisma } from "@prisma/client";
import { vi, describe, test, expect } from "vitest";

import { generateUniqueAPIKey } from "@calcom/ee/api-keys/lib/apiKeys";
import { buildCredential, buildSession } from "@calcom/lib/test/builder";
import { AuditLogApiKeysTriggerEvents } from "@calcom/prisma/enums";
import type { inferProcedureInput } from "@calcom/trpc";
import { createContextInner } from "@calcom/trpc/server/createContext";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { apiKeyRouterCreateCaller } from "@calcom/trpc/server/routers/viewer/apiKeys/_router";

const mockReportEventGeneric = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
  getGenericAuditLogClient: vi.fn().mockImplementation(() => {
    return {
      reportEvent: mockReportEventGeneric,
    };
  }),
}));

async function setUp() {
  const user = await prismock.user.create({
    data: {
      id: 1,
      username: "test",
      name: "Test User",
      email: "test@example.com",
      role: "ADMIN",
    },
  });

  const credential = await prismock.credential.create({
    data: buildCredential({
      userId: user.id,
      key: {
        endpoint: "localhost:3000",
        projectId: "dev",
        apiKey: "",
        disabledEvents: [],
      },
    }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
  });

  const ctx = await createContextInner({
    sourceIp: "127.0.0.0",
    locale: "en",
    session: buildSession({ user }),
  });

  const caller = apiKeyRouterCreateCaller(ctx);
  return { caller, user, credential };
}

describe("handleAuditLogTrigger", () => {
  test("API_KEY_CREATED is reported as expected.", async () => {
    const { caller } = await setUp();

    const input: inferProcedureInput<AppRouter["viewer"]["apiKeys"]["create"]> = {};
    await caller.create(input);

    expect(mockReportEventGeneric).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_CREATED,
      })
    );
  });

  test("API_KEY_DELETED is reported as expected.", async () => {
    const { caller, user } = await setUp();

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
    await caller.delete(input);

    expect(mockReportEventGeneric).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_DELETED,
      })
    );
  });

  test("API_KEY_UPDATED is reported as expected.", async () => {
    const { caller, user } = await setUp();
    const [hashedApiKey] = generateUniqueAPIKey();
    const createdKey = await prismock.apiKey.create({
      data: {
        id: faker.datatype.uuid(),
        userId: user.id,
        note: "API Key used by x.",
        expiresAt: null,
        appId: null,
        hashedKey: hashedApiKey,
      },
    });

    const input: inferProcedureInput<AppRouter["viewer"]["apiKeys"]["delete"]> = {
      id: createdKey.id,
    };
    await caller.edit(input);

    expect(mockReportEventGeneric).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogApiKeysTriggerEvents.API_KEY_UPDATED,
      })
    );
  });
});
