import i18nMock from "../../../../../../tests/libs/__mocks__/libServerI18n";
import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { vi, describe, test, expect } from "vitest";

import { sendPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { buildCredential, buildSession, buildWebhook } from "@calcom/lib/test/builder";
import { IdentityProvider, AuditLogWebhookTriggerEvents } from "@calcom/prisma/enums";
import type { inferProcedureInput } from "@calcom/trpc";
import { buildMockData } from "@calcom/trpc/lib/tests";
import { createContextInner } from "@calcom/trpc/server/createContext";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { webhookRouterCreateCaller } from "@calcom/trpc/server/routers/viewer/webhook/_router";

import { successResponse } from "../../../../../app-store/_utils/testUtils";

vi.mock("@calcom/features/webhooks/lib/sendPayload", () => {
  return {
    default: vi.fn(),
    sendPayload: vi.fn(),
  };
});

const mockReportEventGeneric = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
  getGenericAuditLogClient: vi.fn().mockImplementation(() => {
    return {
      reportEvent: mockReportEventGeneric,
    };
  }),
}));

describe("handleAuditLogTrigger", () => {
  test("WEBHOOK_CREATED is reported as expected.", async () => {
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
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });

    const caller = webhookRouterCreateCaller(ctx);

    const input: inferProcedureInput<AppRouter["viewer"]["webhook"]["create"]> = buildWebhook({
      createdAt: undefined,
      appId: undefined,
      userId: undefined,
      teamId: undefined,
      eventTypeId: undefined,
      payloadTemplate: `{"triggerEvent":"MEETING_ENDED"}`,
    });
    await caller.create(input);

    expect(mockReportEventGeneric).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogWebhookTriggerEvents.WEBHOOK_CREATED,
      })
    );
  });

  test("WEBHOOK_DELETED is reported as expected.", async () => {
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

    const webhook = await prismock.webhook.create({
      data: buildWebhook({
        createdAt: undefined,
        appId: undefined,
        userId: user.id,
        teamId: undefined,
        eventTypeId: undefined,
        payloadTemplate: `{"triggerEvent":"MEETING_ENDED"}`,
      }),
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });

    const caller = webhookRouterCreateCaller(ctx);

    const input: inferProcedureInput<AppRouter["viewer"]["webhook"]["delete"]> = {
      id: webhook.id,
    };
    await caller.delete(input);

    expect(mockReportEventGeneric).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: AuditLogWebhookTriggerEvents.WEBHOOK_DELETED,
      })
    );
  });

  test("WEBHOOK_UPDATED is reported as expected.", async () => {
    vi.mocked(sendPayload).mockImplementation(() => Promise.resolve(successResponse()));
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

    const webhook = await prismock.webhook.create({
      data: buildWebhook({
        createdAt: undefined,
        appId: undefined,
        userId: user.id,
        teamId: undefined,
        eventTypeId: undefined,
        payloadTemplate: `{"triggerEvent":"MEETING_ENDED"}`,
      }),
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });

    const caller = webhookRouterCreateCaller(ctx);

    const input: inferProcedureInput<AppRouter["viewer"]["webhook"]["edit"]> = {
      id: webhook.id,
      payloadTemplate: `{"triggerEvent":"MEETING_STARTED"}`,
    };
    await caller.edit(input);

    expect(mockReportEventGeneric).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogWebhookTriggerEvents.WEBHOOK_UPDATED,
      })
    );
  });

  test("WEBHOOK_TESTED is reported as expected.", async () => {
    vi.mocked(sendPayload).mockImplementation(() => Promise.resolve(successResponse()));
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

    i18nMock.getTranslation.mockImplementation(() => {
      return new Promise((resolve) => {
        const identityFn = (key: string) => key;
        resolve(identityFn);
      });
    });

    const ctx = await createContextInner({
      sourceIp: "127.0.0.0",
      locale: "en",
      session: buildSession({ user }),
      user,
    });

    const caller = webhookRouterCreateCaller(ctx);

    const input: inferProcedureInput<AppRouter["viewer"]["webhook"]["testTrigger"]> = {
      url: "http://localhost:3000",
      secret: "test",
      type: "PING",
      payloadTemplate: `{"triggerEvent":"MEETING_ENDED"}`,
    };
    await caller.testTrigger(input);

    expect(mockReportEventGeneric).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditLogWebhookTriggerEvents.WEBHOOK_TESTED,
      })
    );
  });
});
