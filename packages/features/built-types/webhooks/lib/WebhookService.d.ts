import getWebhooks from "./getWebhooks";
import sendOrSchedulePayload from "./sendOrSchedulePayload";
/** This is a WIP. With minimal methods until the API matures and stabilizes */
export declare class WebhookService {
    private options;
    private webhooks;
    constructor(options: Parameters<typeof getWebhooks>[0]);
    getWebhooks(): {
        id: string;
        appId: string | null;
        subscriberUrl: string;
        payloadTemplate: string | null;
        secret: string | null;
    }[];
    sendPayload(payload: Parameters<typeof sendOrSchedulePayload>[4]): Promise<void>;
}
//# sourceMappingURL=WebhookService.d.ts.map