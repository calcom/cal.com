import prismock from "../../../../tests/libs/__mocks__/prisma";

import { vi, describe, test, expect } from "vitest";

import { buildCredential } from "@calcom/lib/test/builder";
import {
  IdentityProvider,
  AuditLogAppTriggerEvents,
  AuditLogSystemTriggerEvents,
} from "@calcom/prisma/enums";
import { buildMockData } from "@calcom/trpc/lib/tests";
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
  test("intercepts a SYSTEM_CREDENTIALS_UPDATED trigger and assigns SYSTEM_EVENT_OFF when an event was disabled.", async () => {
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
      input: { credentialId: 0, key: { disabledEvents: [AuditLogAppTriggerEvents.APP_KEYS_UPDATED] } },
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

  test("intercepts a SYSTEM_CREDENTIALS_UPDATED trigger and assigns SYSTEM_EVENT_ON when an event was enabled.", async () => {
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
      expect.objectContaining({ action: AuditLogSystemTriggerEvents.SYSTEM_EVENT_OFF })
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
        // AuditLogSystemTriggerEvents.SYSTEM_EVENT_OFF
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

  test("when several auditLog systems are configured, an APP_KEYS_UPDATED trigger is intercepted only when credential updated is the one being reported to.", async () => {
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
      expect.objectContaining({ action: expect.stringMatching("^APP_KEYS_UPDATED$") })
    );
  });
});
