import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import {
  isEventPayload,
  isOOOEntryPayload,
  type WebhookPayloadType,
} from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

export async function handleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: WebhookPayloadType;
}) {
  try {
    const subscribers = await getWebhooks(args.subscriberOptions);

    const promises = subscribers.map((sub) =>
      sendPayload(sub.secret, args.eventTrigger, new Date().toISOString(), sub, args.webhookData).catch(
        (e) => {
          let bookingId, oooEntryId, bookingUid, oooEntryUUID;

          if (isOOOEntryPayload(args.webhookData)) {
            ({ id: oooEntryId, uuid: oooEntryUUID } = args.webhookData.oooEntry);
          }

          if (isEventPayload(args.webhookData)) {
            ({ bookingId, uid: bookingUid } = args.webhookData);
          }

          const idString = bookingId ? `booking id:${bookingId}` : `ooo entry id:${oooEntryId}`;

          const uidOrUUIDString = bookingUid ? `booking uid:${bookingId}` : `ooo entry UUID:${oooEntryUUID}`;

          logger.error(
            `Error executing webhook for event: ${args.eventTrigger}, URL: ${sub.subscriberUrl}, ${idString}, ${uidOrUUIDString}`,
            safeStringify(e)
          );
        }
      )
    );
    await Promise.all(promises);
  } catch (error) {
    logger.error("Error while sending webhook", error);
  }
}
