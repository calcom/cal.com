import prismock from "../../../../tests/libs/__mocks__/prisma";

import { faker } from "@faker-js/faker";
import { vi, describe, test, expect } from "vitest";

import { buildCredential, buildApp } from "@calcom/lib/test/builder";
import {
  IdentityProvider,
  AuditLogAppTriggerEvents,
  AuditLogCredentialTriggerEvents,
  AuditLogSystemTriggerEvents,
} from "@calcom/prisma/enums";
import { buildMockData } from "@calcom/trpc/lib/tests";
import { saveKeysHandler } from "@calcom/trpc/server/routers/viewer/apps/saveKeys.handler";
import { toggleHandler } from "@calcom/trpc/server/routers/viewer/apps/toggle.handler";
import { updateAppCredentialsHandler } from "@calcom/trpc/server/routers/viewer/apps/updateAppCredentials.handler";

import { handleAuditLogTrigger } from "../lib/handleAuditLogTrigger";

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
      }),
    });

    const result = await updateAppCredentialsHandler({
      ctx: { user },
      input: {
        credentialId: 0,
        key: { disabledEvents: [AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED] },
      },
    });

    await handleAuditLogTrigger({
      action: "updateAppCredentials",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: { oldCredential: result.oldCredential, updatedCredential: result.updatedCredential },
    });

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
      }),
    });

    const result = await updateAppCredentialsHandler({
      ctx: { user },
      input: { credentialId: 0, key: { disabledEvents: [] } },
    });

    await handleAuditLogTrigger({
      action: "updateAppCredentials",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: { oldCredential: result.oldCredential, updatedCredential: result.updatedCredential },
    });

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
      }),
    });

    const result = await updateAppCredentialsHandler({
      ctx: { user },
      input: { credentialId: 0, key: { apiKey: "Api key updated" } },
    });

    await handleAuditLogTrigger({
      action: "updateAppCredentials",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: { oldCredential: result.oldCredential, updatedCredential: result.updatedCredential },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringMatching(`^SYSTEM_SETTINGS_UPDATED$`),
        description: "App keys have been updated",
        crud: "u",
        target: { id: 0, name: "test", type: "SYSTEM" },
        actor: { id: "1", name: "Oliver Q." },
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
      }),
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
      }),
    });

    // Should change APP_KEYS_UDATED to SYSTEM_SETTINGS_UPDATED only when expected.
    const result = await updateAppCredentialsHandler({
      ctx: { user },
      input: { credentialId: 1, key: { endpoint: "localhost" } },
    });

    await handleAuditLogTrigger({
      action: "updateAppCredentials",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: { oldCredential: result.oldCredential, updatedCredential: result.updatedCredential },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringMatching("^SYSTEM_SETTINGS_UPDATED$") })
    );

    expect(mockReportEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: expect.stringMatching("^CREDENTIAL_KEYS_UPDATED$") })
    );
  });

  test("reports APP_TOGGLE as expected.", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    await prismock.app.create({
      data: buildApp({
        slug: "zohocalendar",
        dirName: "zohocalendar",
        categories: ["zohocalendar"],
      }),
    });

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

    const result = await toggleHandler({
      ctx: { user },
      input: {
        slug: "zohocalendar",
        enabled: true,
      },
    });

    await handleAuditLogTrigger({
      action: "toggleApp",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: result.data,
    });

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
      }),
    });
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

    const result = await saveKeysHandler({
      ctx: { user },
      input: {
        slug: zohoApp.slug,
        dirName: zohoApp.dirName,
        type: "",
        // Validate w/ app specific schema
        keys: {
          client_id: faker.datatype.uuid(),
          client_secret: faker.datatype.uuid(),
        },
        fromEnabled: false,
      },
    });

    await handleAuditLogTrigger({
      action: "saveKeys",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: result.data,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogAppTriggerEvents.APP_KEYS_UPDATED })
    );
  });
});
