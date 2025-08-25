import { WebhookNotifierAdapter } from "../infrastructure";
import { BookingWebhookService } from "../service/BookingWebhookService";
import { WebhookService } from "../service/WebhookService";

/**
 * Factory for creating BookingWebhookService with default dependencies
 */
export function createBookingWebhookService(): BookingWebhookService {
  return new BookingWebhookService(new WebhookNotifierAdapter(), new WebhookService());
}
