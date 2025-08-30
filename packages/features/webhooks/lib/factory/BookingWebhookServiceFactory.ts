import { WebhookRepository } from "../repository/WebhookRepository";
import { BookingWebhookService } from "../service/BookingWebhookService";
import { WebhookNotificationHandler } from "../service/WebhookNotificationHandler";
import { WebhookNotifier } from "../service/WebhookNotifier";
import { WebhookService } from "../service/WebhookService";
import { BookingPayloadBuilder } from "./BookingPayloadBuilder";
import { FormPayloadBuilder } from "./FormPayloadBuilder";
import { InstantMeetingBuilder } from "./InstantMeetingBuilder";
import { MeetingPayloadBuilder } from "./MeetingPayloadBuilder";
import { OOOPayloadBuilder } from "./OOOPayloadBuilder";
import { RecordingPayloadBuilder } from "./RecordingPayloadBuilder";
import { WebhookPayloadFactory } from "./WebhookPayloadFactory";

export function createBookingWebhookService(): BookingWebhookService {
  // Create payload builders
  const bookingPayloadBuilder = new BookingPayloadBuilder();
  const formPayloadBuilder = new FormPayloadBuilder();
  const oooPayloadBuilder = new OOOPayloadBuilder();
  const recordingPayloadBuilder = new RecordingPayloadBuilder();
  const meetingPayloadBuilder = new MeetingPayloadBuilder();
  const instantMeetingBuilder = new InstantMeetingBuilder();

  // Create payload factory with all builders
  const payloadFactory = new WebhookPayloadFactory(
    bookingPayloadBuilder,
    formPayloadBuilder,
    oooPayloadBuilder,
    recordingPayloadBuilder,
    meetingPayloadBuilder,
    instantMeetingBuilder
  );

  // Create repository and webhook service
  const repository = new WebhookRepository();
  const webhookService = new WebhookService(repository);

  // Create notification handler
  const notificationHandler = new WebhookNotificationHandler(webhookService, payloadFactory);

  // Create instance-based webhook notifier
  const webhookNotifier = new WebhookNotifier(notificationHandler);

  return new BookingWebhookService(webhookNotifier, webhookService);
}
