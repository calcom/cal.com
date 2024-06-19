import sendOrSchedulePayload from "webhooks/lib/sendOrSchedulePayload";

import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/client";

import getWebhooks from "./getWebhooks";

const log = logger.getSubLogger({ prefix: ["[WebhookService] "] });

export type GetSubscriberOptions = {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | null;
  orgId?: number | null;
};

/** This is a WIP. With minimal methods until the API matures and stabilizes */
export class WebhookService {
  private options = {} as GetSubscriberOptions;
  private webhooks: Awaited<ReturnType<typeof getWebhooks>> = [];
  constructor(init: GetSubscriberOptions) {
    return (async (): Promise<WebhookService> => {
      this.options = init;
      this.webhooks = await getWebhooks(init);
      return this;
    })() as unknown as WebhookService;
  }
  async getWebhooks() {
    return this.webhooks;
  }
  async sendPayload(payload: WebhookPayload) {
    const promises = this.webhooks.map((sub) =>
      sendOrSchedulePayload(
        sub.secret,
        this.options.triggerEvent,
        new Date().toISOString(),
        sub,
        payload
      ).catch((e) => {
        log.error(
          `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_REQUESTED}, URL: ${sub.subscriberUrl}`,
          safeStringify(e)
        );
      })
    );
    await Promise.all(promises);
  }
}
