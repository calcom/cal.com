import { createModule } from "@evyweb/ioctopus";

import { BookingPayloadBuilder } from "@calcom/features/webhooks/lib/factory/BookingPayloadBuilder";
import { FormPayloadBuilder } from "@calcom/features/webhooks/lib/factory/FormPayloadBuilder";
import { InstantMeetingBuilder } from "@calcom/features/webhooks/lib/factory/InstantMeetingBuilder";
import { MeetingPayloadBuilder } from "@calcom/features/webhooks/lib/factory/MeetingPayloadBuilder";
import { OOOPayloadBuilder } from "@calcom/features/webhooks/lib/factory/OOOPayloadBuilder";
import { RecordingPayloadBuilder } from "@calcom/features/webhooks/lib/factory/RecordingPayloadBuilder";
import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import { BookingWebhookService } from "@calcom/features/webhooks/lib/service/BookingWebhookService";
import { FormWebhookService } from "@calcom/features/webhooks/lib/service/FormWebhookService";
import { OOOWebhookService } from "@calcom/features/webhooks/lib/service/OOOWebhookService";
import { RecordingWebhookService } from "@calcom/features/webhooks/lib/service/RecordingWebhookService";
import { WebhookNotificationHandler } from "@calcom/features/webhooks/lib/service/WebhookNotificationHandler";
import { WebhookNotifier } from "@calcom/features/webhooks/lib/service/WebhookNotifier";
import { WebhookService } from "@calcom/features/webhooks/lib/service/WebhookService";

import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

export const webhookModule = createModule();

// Bind repository
webhookModule.bind(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY).toClass(WebhookRepository);

// Bind services
webhookModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_SERVICE)
  .toClass(WebhookService, [WEBHOOK_TOKENS.WEBHOOK_REPOSITORY, SHARED_TOKENS.TASKER, SHARED_TOKENS.LOGGER]);

webhookModule
  .bind(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE)
  .toClass(BookingWebhookService, [
    WEBHOOK_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_TOKENS.WEBHOOK_SERVICE,
    SHARED_TOKENS.TASKER,
    SHARED_TOKENS.LOGGER,
  ]);

webhookModule
  .bind(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE)
  .toClass(FormWebhookService, [WEBHOOK_TOKENS.WEBHOOK_NOTIFIER, WEBHOOK_TOKENS.WEBHOOK_SERVICE]);

webhookModule
  .bind(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE)
  .toClass(RecordingWebhookService, [WEBHOOK_TOKENS.WEBHOOK_NOTIFIER]);

webhookModule
  .bind(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE)
  .toClass(OOOWebhookService, [
    WEBHOOK_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_TOKENS.WEBHOOK_REPOSITORY,
    SHARED_TOKENS.TASKER,
    SHARED_TOKENS.LOGGER,
  ]);

// Bind payload builders
webhookModule.bind(WEBHOOK_TOKENS.BOOKING_PAYLOAD_BUILDER).toClass(BookingPayloadBuilder);
webhookModule.bind(WEBHOOK_TOKENS.FORM_PAYLOAD_BUILDER).toClass(FormPayloadBuilder);
webhookModule.bind(WEBHOOK_TOKENS.OOO_PAYLOAD_BUILDER).toClass(OOOPayloadBuilder);
webhookModule.bind(WEBHOOK_TOKENS.RECORDING_PAYLOAD_BUILDER).toClass(RecordingPayloadBuilder);
webhookModule.bind(WEBHOOK_TOKENS.MEETING_PAYLOAD_BUILDER).toClass(MeetingPayloadBuilder);
webhookModule.bind(WEBHOOK_TOKENS.INSTANT_MEETING_BUILDER).toClass(InstantMeetingBuilder);

// Bind notification handler
webhookModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_NOTIFICATION_HANDLER)
  .toClass(WebhookNotificationHandler, [
    WEBHOOK_TOKENS.WEBHOOK_SERVICE,
    WEBHOOK_TOKENS.BOOKING_PAYLOAD_BUILDER,
    WEBHOOK_TOKENS.FORM_PAYLOAD_BUILDER,
    WEBHOOK_TOKENS.OOO_PAYLOAD_BUILDER,
    WEBHOOK_TOKENS.RECORDING_PAYLOAD_BUILDER,
    WEBHOOK_TOKENS.MEETING_PAYLOAD_BUILDER,
    WEBHOOK_TOKENS.INSTANT_MEETING_BUILDER,
    SHARED_TOKENS.LOGGER,
  ]);

// Bind notifier
webhookModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER)
  .toClass(WebhookNotifier, [WEBHOOK_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, SHARED_TOKENS.LOGGER]);
