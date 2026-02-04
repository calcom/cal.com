import { DEFAULT_WEBHOOK_VERSION } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";

import { getTranslation } from "@calcom/lib/server/i18n";

import type { TTestTriggerInputSchema } from "./testTrigger.schema";

type TestTriggerOptions = {
  ctx: Record<string, unknown>;
  input: TTestTriggerInputSchema;
};

export const testTriggerHandler = async ({ ctx: _ctx, input }: TestTriggerOptions) => {
  const { url, type, payloadTemplate = null, secret = null } = input;
  const translation = await getTranslation("en", "common");
  const language = {
    locale: "en",
    translate: translation,
  };

  const data: EventPayloadType = {
    type: "Test",
    title: "Test trigger event",
    description: "",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    attendees: [
      {
        email: "jdoe@example.com",
        name: "John Doe",
        timeZone: "Europe/London",
        language,
      },
    ],
    organizer: {
      name: "Cal",
      email: "no-reply@cal.com",
      timeZone: "Europe/London",
      language,
    },
  };

  try {
    const webhook = { subscriberUrl: url, appId: null, payloadTemplate, version: DEFAULT_WEBHOOK_VERSION };
    return await sendPayload(secret, type, new Date().toISOString(), webhook, data);
  } catch {
    return {
      ok: false,
      status: 500,
    };
  }
};
