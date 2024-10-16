import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { ResponseData } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWebhook";
import { triggerFormSubmittedNoEventWebhook } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWebhook";
import type { Webhook } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

function expectFormSubmittedNoEventWebhookToBeCalled(
  payload: ResponseData & {
    webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate" | "secret">;
  }
) {
  const fetchCalls = fetchMock.mock.calls;

  const webhooksToSubscriberUrl = fetchCalls.filter((call) => {
    return call[0] === payload.webhook.subscriberUrl;
  });

  const webhookFetchCall = webhooksToSubscriberUrl.find((call) => {
    const body = call[1]?.body;
    const parsedBody = JSON.parse((body as string) || "{}");
    return parsedBody.triggerEvent === WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT;
  });

  if (!webhookFetchCall) {
    throw new Error(
      `Webhook not sent to ${
        payload.webhook.subscriberUrl
      } for FORM_SUBMITTED_NO_EVENT. All webhooks: ${JSON.stringify(webhooksToSubscriberUrl)}`
    );
  }

  expect(webhookFetchCall[0]).toBe(payload.webhook.subscriberUrl);

  const body = webhookFetchCall[1]?.body;
  const parsedBody = JSON.parse((body as string) || "{}");
  expect(parsedBody.triggerEvent).toBe(WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT);

  const webhookPayload = {
    responses: payload.responses,
    formId: payload.form.id,
    formName: payload.form.name,
    teamId: null,
  };

  expect(parsedBody.payload).toEqual(webhookPayload);
}

describe("Form submitted but no event booking trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Ensures clean state for each test
    prismaMock.booking.findFirst.mockReset();
  });
  it(`should trigger when form was submitted but no booking was made`, async () => {
    const payload = {
      responseId: 1,
      responses: {
        "Test field 1": {
          value: "Test input 1",
          response: "Test input 1",
        },
      },
      form: {
        id: "6789",
        name: "Test Form 1",
        teamId: null,
      },
      webhook: {
        subscriberUrl: "https://example1.com",
        appId: null,
        payloadTemplate: null,
        secret: null,
      },
    } satisfies ResponseData & {
      webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate" | "secret">;
    };
    const payloadString = JSON.stringify(payload);

    prismaMock.booking.findFirst.mockResolvedValue({ id: 5 });

    const booking = await prismaMock.booking.findFirst();

    console.log(`booking ${JSON.stringify(booking)}`);
    await triggerFormSubmittedNoEventWebhook(payloadString);

    const webhooksToSubscriberUrl = fetchMock.mock.calls.filter((call) => {
      return call[0] === payload.webhook.subscriberUrl;
    });

    expect(webhooksToSubscriberUrl.length).toBe(0);
  });
});
