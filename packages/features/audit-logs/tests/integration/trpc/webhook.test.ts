import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { mockNoTranslations } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import type { Credential, Prisma } from "@prisma/client";
import { vi, describe, test, expect } from "vitest";

import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { buildCredential, buildSession, buildWebhook } from "@calcom/lib/test/builder";
import { AuditLogWebhookTriggerEvents } from "@calcom/prisma/enums";
import type { inferProcedureInput } from "@calcom/trpc";
import { createContextInner } from "@calcom/trpc/server/createContext";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { webhookRouterCreateCaller } from "@calcom/trpc/server/routers/viewer/webhook/_router";

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

  const caller = webhookRouterCreateCaller(ctx);
  return { caller, user, credential };
}

describe("handleAuditLogTrigger", () => {
  test("WEBHOOK_CREATED is reported as expected.", async () => {
    const { caller } = await setUp();
    const input: inferProcedureInput<AppRouter["viewer"]["webhook"]["create"]> = buildWebhook({
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
    const { caller, user } = await setUp();

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
    vi.mocked(sendPayload).mockImplementation(() =>
      Promise.resolve({ ok: true, status: 200, message: "success" })
    );

    const { caller, user } = await setUp();

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
    const { caller } = await setUp();

    mockNoTranslations();
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
