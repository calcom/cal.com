import prismaMock from "../../../../../tests/libs/__mocks__/prisma";

import type { Booking } from "@prisma/client";
import type { WebhookTriggerEvents } from "@prisma/client";
import { expect } from "vitest";
import "vitest-fetch-mock";

import logger from "@calcom/lib/logger";
import type { Fixtures } from "@calcom/web/test/fixtures/fixtures";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveEmail(expectedEmail: { htmlToContain?: string; to: string }, to: string): R;
    }
  }
}

expect.extend({
  toHaveEmail(
    testEmails: ReturnType<Fixtures["emails"]["get"]>,
    expectedEmail: {
      //TODO: Support email HTML parsing to target specific elements
      htmlToContain?: string;
      to: string;
    },
    to: string
  ) {
    const testEmail = testEmails.find((email) => email.to === to);
    if (!testEmail) {
      return {
        pass: false,
        message: () => `No email sent to ${to}`,
      };
    }
    let isHtmlContained = true;
    let isToAddressExpected = true;
    if (expectedEmail.htmlToContain) {
      isHtmlContained = testEmail.html.includes(expectedEmail.htmlToContain);
    }
    isToAddressExpected = expectedEmail.to === testEmail.to;

    return {
      pass: isHtmlContained && isToAddressExpected,
      message: () => {
        if (!isHtmlContained) {
          return `Email HTML is not as expected. Expected:"${expectedEmail.htmlToContain}" isn't contained in "${testEmail.html}"`;
        }
        return `Email To address is not as expected. Expected:${expectedEmail.to} isn't equal to ${testEmail.to}`;
      },
    };
  },
});

export function expectWebhookToHaveBeenCalledWith(
  subscriberUrl: string,
  data: {
    triggerEvent: WebhookTriggerEvents;
    payload: Record<string, unknown> | null;
  }
) {
  const fetchCalls = fetchMock.mock.calls;
  const webhooksToSubscriberUrl = fetchCalls.filter((call) => {
    return call[0] === subscriberUrl;
  });
  logger.silly("Scanning fetchCalls for webhook", fetchCalls);
  const webhookFetchCall = webhooksToSubscriberUrl.find((call) => {
    const body = call[1]?.body;
    const parsedBody = JSON.parse((body as string) || "{}");
    return parsedBody.triggerEvent === data.triggerEvent;
  });

  if (!webhookFetchCall) {
    throw new Error(
      `Webhook not sent to ${subscriberUrl} for ${data.triggerEvent}. All webhooks: ${JSON.stringify(
        webhooksToSubscriberUrl
      )}`
    );
  }
  expect(webhookFetchCall[0]).toBe(subscriberUrl);
  const body = webhookFetchCall[1]?.body;
  const parsedBody = JSON.parse((body as string) || "{}");

  expect(parsedBody.triggerEvent).toBe(data.triggerEvent);
  if (parsedBody.payload.metadata?.videoCallUrl) {
    parsedBody.payload.metadata.videoCallUrl = parsedBody.payload.metadata.videoCallUrl
      ? parsedBody.payload.metadata.videoCallUrl.replace(/\/video\/[a-zA-Z0-9]{22}/, "/video/DYNAMIC_UID")
      : parsedBody.payload.metadata.videoCallUrl;
  }
  if (data.payload) {
    if (data.payload.metadata !== undefined) {
      expect(parsedBody.payload.metadata).toEqual(expect.objectContaining(data.payload.metadata));
    }
    if (data.payload.responses !== undefined)
      expect(parsedBody.payload.responses).toEqual(expect.objectContaining(data.payload.responses));
    const { responses, metadata, ...remainingPayload } = data.payload;
    expect(parsedBody.payload).toEqual(expect.objectContaining(remainingPayload));
  }
}

export function expectWorkflowToBeTriggered() {
  // TODO: Implement this.
}

export function expectBookingToBeInDatabase(booking: Partial<Booking> & Pick<Booking, "id">) {
  const actualBooking = prismaMock.booking.findUnique({
    where: {
      id: booking.id,
    },
  });
  expect(actualBooking).toEqual(expect.objectContaining(booking));
}
