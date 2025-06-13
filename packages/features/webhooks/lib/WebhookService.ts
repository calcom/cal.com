import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import getWebhooks from "./getWebhooks";
import type { GetSubscriberOptions, GetWebhooksReturnType } from "./getWebhooks";
import sendOrSchedulePayload from "./sendOrSchedulePayload";

const log = logger.getSubLogger({ prefix: ["[WebhookService] "] });

/** This is a WIP. With minimal methods until the API matures and stabilizes */
export class WebhookService {
  private constructor(private options: GetSubscriberOptions, private webhooks: GetWebhooksReturnType) {}
  static async init(options: GetSubscriberOptions) {
    const webhooks = await getWebhooks(options);
    return new WebhookService(options, webhooks);
  }
  getWebhooks() {
    return this.webhooks;
  }
  async sendPayload(payload: Parameters<typeof sendOrSchedulePayload>[4]) {
    const promises = this.webhooks.map((sub) =>
      sendOrSchedulePayload(
        sub.secret,
        this.options.triggerEvent,
        new Date().toISOString(),
        sub,
        payload
      ).catch((e) => {
        log.error(
          `Error executing webhook for event: ${this.options.triggerEvent}, URL: ${sub.subscriberUrl}`,
          safeStringify(e)
        );
      })
    );
    await Promise.allSettled(promises);
  }
}
