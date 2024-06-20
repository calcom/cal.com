import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { faker } from "@faker-js/faker";
import type { Credential, App, Prisma, User } from "@prisma/client";
import { vi, describe, test, expect } from "vitest";

import type { AppKeys } from "@calcom/app-store/templates/audit-log-implementation/zod";
import { buildCredential, buildApp } from "@calcom/lib/test/builder";
import { buildSession } from "@calcom/lib/test/builder";
import {
  AuditLogAppTriggerEvents,
  AuditLogCredentialTriggerEvents,
  AuditLogSystemTriggerEvents,
} from "@calcom/prisma/enums";
import type { inferProcedureInput } from "@calcom/trpc";
import { createContextInner } from "@calcom/trpc/server/createContext";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { appsRouterCreateCaller } from "@calcom/trpc/server/routers/viewer/apps/_router";

const mockReportEvent = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
  getGenericAuditLogClient: vi.fn().mockImplementation(() => {
    return {
      reportEvent: mockReportEvent,
    };
  }),
}));

async function setUp(credentialKey?: Prisma.InputJsonObject) {
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
      id: 0,
      key: {
        endpoint: "localhost:3000",
        projectId: "dev",
        apiKey: "",
        disabledEvents: [],
        ...credentialKey,
      },
    }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
  });

  const ctx = await createContextInner({
    sourceIp: "127.0.0.0",
    locale: "en",
    session: buildSession({ user }),
  });

  const caller = appsRouterCreateCaller(ctx);
  return { caller, user, credential };
}

describe("handleAuditLogTrigger", () => {
  test("intercepts a SYSTEM_SETTINGS_UPDATED trigger and assigns SYSTEM_EVENT_OFF when an event was disabled.", async () => {
    const { caller, credential } = await setUp();

    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["updateAppCredentials"]> = {
      credentialId: credential.id,
      key: { disabledEvents: [AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED] },
    };
    await caller.updateAppCredentials(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogSystemTriggerEvents.SYSTEM_EVENT_OFF })
    );
  });

  test("intercepts a SYSTEM_SETTINGS_UPDATED trigger and assigns SYSTEM_EVENT_ON when an event was enabled.", async () => {
    const { credential, caller } = await setUp({
      disabledEvents: [AuditLogAppTriggerEvents.APP_KEYS_UPDATED],
    });

    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["updateAppCredentials"]> = {
      credentialId: credential.id,
      key: { disabledEvents: [] },
    };
    await caller.updateAppCredentials(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogSystemTriggerEvents.SYSTEM_EVENT_ON })
    );
  });

  test("reports all SYSTEM event triggers, regardless of disabledEvents.", async () => {
    const { credential, caller } = await setUp({
      disabledEvents: Object.values(AuditLogSystemTriggerEvents),
    });

    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["updateAppCredentials"]> = {
      credentialId: credential.id,
      key: { apiKey: "Api key updated" },
    };
    await caller.updateAppCredentials(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED })
    );
  });

  test("when several auditLog systems are configured, an CREDENTIAL_KEYS_UPDATED trigger is intercepted only when credential updated is the one being reported to.", async () => {
    const { user, credential, caller } = await setUp();

    await prismock.credential.create({
      data: buildCredential({
        id: 1,
        userId: user.id,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
    });

    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["updateAppCredentials"]> = {
      credentialId: credential.id,
      key: { apiKey: "Api key updated" },
    };
    await caller.updateAppCredentials(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringMatching("^SYSTEM_SETTINGS_UPDATED$") })
    );

    expect(mockReportEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: expect.stringMatching("^CREDENTIAL_KEYS_UPDATED$") })
    );
  });

  test("reports APP_TOGGLE as expected.", async () => {
    const user: User = await prismock.user.create({
      data: {
        id: 1,
        username: "test",
        name: "Test User",
        email: "test@example.com",
        role: "ADMIN",
      },
    });

    await prismock.app.create({
      data: buildApp({
        slug: "zohocalendar",
        dirName: "zohocalendar",
        categories: ["calendar"],
      }) as Omit<App, "keys"> & { keys: Prisma.InputJsonObject },
    });

    await prismock.credential.create({
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

    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["toggle"]> = {
      slug: "zohocalendar",
      enabled: true,
    };

    const caller = appsRouterCreateCaller(ctx);

    await caller.toggle(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogAppTriggerEvents.APP_TOGGLE })
    );
  });

  test("reports APP_KEYS_UPDATED as expected.", async () => {
    const user = await prismock.user.create({
      data: {
        id: 1,
        username: "test",
        name: "Test User",
        email: "test@example.com",
        role: "ADMIN",
      },
    });

    const zohoApp = await prismock.app.create({
      data: buildApp({
        slug: "zohocalendar",
        dirName: "zohocalendar",
        categories: ["calendar"],
      }) as Omit<App, "keys"> & { keys: Prisma.InputJsonObject },
    });

    await prismock.credential.create({
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

    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["saveKeys"]> = {
      slug: zohoApp.slug,
      dirName: zohoApp.dirName,
      type: "",
      keys: {
        client_id: faker.datatype.uuid(),
        client_secret: faker.datatype.uuid(),
      },
      fromEnabled: false,
    };

    const caller = appsRouterCreateCaller(ctx);

    await caller.saveKeys(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogAppTriggerEvents.APP_KEYS_UPDATED })
    );
  });
});
