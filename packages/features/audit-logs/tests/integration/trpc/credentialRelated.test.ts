import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { faker } from "@faker-js/faker";
import { vi, describe, test, expect } from "vitest";

import { buildCredential, buildApp } from "@calcom/lib/test/builder";
import { buildSession } from "@calcom/lib/test/builder";
import {
  IdentityProvider,
  AuditLogAppTriggerEvents,
  AuditLogCredentialTriggerEvents,
  AuditLogSystemTriggerEvents,
} from "@calcom/prisma/enums";
import type { inferProcedureInput } from "@calcom/trpc";
import { buildMockData } from "@calcom/trpc/lib/tests";
import { createContextInner } from "@calcom/trpc/server/createContext";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { appsRouterCreateCaller } from "@calcom/trpc/server/routers/viewer/apps/_router";

import type { Credential, App } from ".prisma/client";

const mockReportEvent = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
  getGenericAuditLogClient: vi.fn().mockImplementation(() => {
    return {
      reportEvent: mockReportEvent,
    };
  }),
}));

describe("handleAuditLogTrigger", () => {
  test("intercepts a SYSTEM_SETTINGS_UPDATED trigger and assigns SYSTEM_EVENT_OFF when an event was disabled.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");

    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });
    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });
    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["updateAppCredentials"]> = {
      credentialId: 0,
      key: { disabledEvents: [AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED] },
    };
    const caller = appsRouterCreateCaller(ctx);

    await caller.updateAppCredentials(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogSystemTriggerEvents.SYSTEM_EVENT_OFF })
    );
  });

  test("intercepts a SYSTEM_SETTINGS_UPDATED trigger and assigns SYSTEM_EVENT_ON when an event was enabled.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [AuditLogAppTriggerEvents.APP_KEYS_UPDATED],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });
    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["updateAppCredentials"]> = {
      credentialId: 0,
      key: { disabledEvents: [] },
    };
    const caller = appsRouterCreateCaller(ctx);

    await caller.updateAppCredentials(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogSystemTriggerEvents.SYSTEM_EVENT_ON })
    );
  });

  test("reports all SYSTEM event triggers, regardless of disabledEvents.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: Object.values(AuditLogSystemTriggerEvents),
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });
    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["updateAppCredentials"]> = {
      credentialId: 0,
      key: { apiKey: "Api key updated" },
    };
    const caller = appsRouterCreateCaller(ctx);

    await caller.updateAppCredentials(input);

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringMatching(`^${AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED}$`),
        target: { id: 0, name: "test", type: "SYSTEM" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
      })
    );
  });

  test("when several auditLog systems are configured, an CREDENTIAL_KEYS_UPDATED trigger is intercepted only when credential updated is the one being reported to.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");

    // Create two auditLog credentials
    await prismock.credential.create({
      data: buildCredential({
        id: 1,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await prismock.credential.create({
      data: buildCredential({
        id: 0,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });
    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["updateAppCredentials"]> = {
      credentialId: 0,
      key: { apiKey: "Api key updated" },
    };
    const caller = appsRouterCreateCaller(ctx);

    await caller.updateAppCredentials(input);

    expect(mockReportEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: expect.stringMatching("^SYSTEM_SETTINGS_UPDATED$") })
    );

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringMatching("^CREDENTIAL_KEYS_UPDATED$") })
    );
  });

  test("reports APP_TOGGLE as expected.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.app.create({
      data: buildApp({
        slug: "zohocalendar",
        dirName: "zohocalendar",
        categories: ["calendar"],
      }) as Omit<App, "keys"> & { keys: any },
    });

    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
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
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    const zohoApp = await prismock.app.create({
      data: buildApp({
        slug: "zohocalendar",
        dirName: "zohocalendar",
        categories: ["calendar"],
      }) as Omit<App, "keys"> & { keys: any },
    });
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });
    const input: inferProcedureInput<AppRouter["viewer"]["appsRouter"]["saveKeys"]> = {
      slug: zohoApp.slug,
      dirName: zohoApp.dirName,
      type: "",
      // Validate w/ app specific schema
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
