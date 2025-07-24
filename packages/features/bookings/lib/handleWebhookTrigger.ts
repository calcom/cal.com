import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { isEventPayload, type WebhookPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { TraceContext } from "@calcom/lib/tracing";
import { distributedTracing } from "@calcom/lib/tracing/factory";

async function _handleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: WebhookPayloadType;
  isDryRun?: boolean;
  traceContext: TraceContext;
}) {
  if (args.isDryRun) return;

  const spanContext = args.traceContext
    ? distributedTracing.createSpan(args.traceContext, "webhook_trigger", {
        meta: {
          eventTrigger: args.eventTrigger,
          isDryRun: args.isDryRun,
        },
      })
    : distributedTracing.createTrace("webhook_trigger_fallback", {
        meta: {
          eventTrigger: args.eventTrigger,
          isDryRun: args.isDryRun,
        },
      });
  const tracingLogger = distributedTracing.getTracingLogger(spanContext);

  try {
    tracingLogger.info("Handling webhook trigger", {
      eventTrigger: args.eventTrigger,
      originalTraceId: args.traceContext?.traceId,
    });

    const subscribers = await getWebhooks(args.subscriberOptions);

    const promises = subscribers.map((sub) =>
      sendPayload(sub.secret, args.eventTrigger, new Date().toISOString(), sub, args.webhookData).catch(
        (e) => {
          if (isEventPayload(args.webhookData)) {
            tracingLogger.error(
              `Error executing webhook for event: ${args.eventTrigger}, URL: ${sub.subscriberUrl}, booking id: ${args.webhookData.bookingId}, booking uid: ${args.webhookData.uid}`,
              safeStringify(e)
            );
          }
        }
      )
    );
    await Promise.all(promises);
  } catch (error) {
    tracingLogger.error("Error while sending webhook", error);
  }
}

export const handleWebhookTrigger = withReporting(_handleWebhookTrigger, "handleWebhookTrigger");
