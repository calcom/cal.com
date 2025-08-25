import { WebhookNotifierAdapter } from "../infrastructure";
import { WebhookRepository } from "../repository/WebhookRepository";
import { BookingWebhookService } from "../service/BookingWebhookService";
import { WebhookService } from "../service/WebhookService";

export function createBookingWebhookService(): BookingWebhookService {
  return new BookingWebhookService(new WebhookNotifierAdapter(), new WebhookService(new WebhookRepository()));
}
