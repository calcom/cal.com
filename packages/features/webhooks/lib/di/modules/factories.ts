import { createModule } from "@evyweb/ioctopus";

import { BookingPayloadBuilder } from "../../factory/BookingPayloadBuilder";
import { FormPayloadBuilder } from "../../factory/FormPayloadBuilder";
import { InstantMeetingBuilder } from "../../factory/InstantMeetingBuilder";
import { MeetingPayloadBuilder } from "../../factory/MeetingPayloadBuilder";
import { OOOPayloadBuilder } from "../../factory/OOOPayloadBuilder";
import { RecordingPayloadBuilder } from "../../factory/RecordingPayloadBuilder";
import { WebhookNotificationHandler } from "../../service/WebhookNotificationHandler";
import { WebhookNotifier } from "../../service/WebhookNotifier";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const webhookFactoryModule = createModule();

// Bind all payload builders
webhookFactoryModule.bind(WEBHOOK_DI_TOKENS.BOOKING_PAYLOAD_BUILDER).toClass(BookingPayloadBuilder);

webhookFactoryModule.bind(WEBHOOK_DI_TOKENS.FORM_PAYLOAD_BUILDER).toClass(FormPayloadBuilder);

webhookFactoryModule.bind(WEBHOOK_DI_TOKENS.OOO_PAYLOAD_BUILDER).toClass(OOOPayloadBuilder);

webhookFactoryModule.bind(WEBHOOK_DI_TOKENS.RECORDING_PAYLOAD_BUILDER).toClass(RecordingPayloadBuilder);

webhookFactoryModule.bind(WEBHOOK_DI_TOKENS.MEETING_PAYLOAD_BUILDER).toClass(MeetingPayloadBuilder);

webhookFactoryModule.bind(WEBHOOK_DI_TOKENS.INSTANT_MEETING_BUILDER).toClass(InstantMeetingBuilder);

// Bind notification handler with individual builders
webhookFactoryModule
  .bind(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFICATION_HANDLER)
  .toClass(WebhookNotificationHandler, [
    WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE,
    WEBHOOK_DI_TOKENS.BOOKING_PAYLOAD_BUILDER,
    WEBHOOK_DI_TOKENS.FORM_PAYLOAD_BUILDER,
    WEBHOOK_DI_TOKENS.OOO_PAYLOAD_BUILDER,
    WEBHOOK_DI_TOKENS.RECORDING_PAYLOAD_BUILDER,
    WEBHOOK_DI_TOKENS.MEETING_PAYLOAD_BUILDER,
    WEBHOOK_DI_TOKENS.INSTANT_MEETING_BUILDER,
    WEBHOOK_DI_TOKENS.LOGGER,
  ]);

// Bind notifier
webhookFactoryModule
  .bind(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER)
  .toClass(WebhookNotifier, [WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, WEBHOOK_DI_TOKENS.LOGGER]);
