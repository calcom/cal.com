import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import getWebhooks from "./getWebhooks";
import sendOrSchedulePayload from "./sendOrSchedulePayload";

const log = logger.getSubLogger({ prefix: ["[WebhookService] "] });

/** This is a WIP. With minimal methods until the API matures and stabilizes */
export class WebhookService {
  private options = {} as Parameters<typeof getWebhooks>[0];
  private webhooks: Awaited<ReturnType<typeof getWebhooks>> = [];
  constructor(options: Parameters<typeof getWebhooks>[0]) {
    return (async (): Promise<WebhookService> => {
      this.options = options;
      this.webhooks = await getWebhooks(options);
      return this;
    })() as unknown as WebhookService;
  }
  async getWebhooks() {
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
