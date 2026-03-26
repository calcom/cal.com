/**
 * Injection token for IWebhookProducerService.
 * Used to bridge the Cal.com DI container into NestJS.
 *
 * Defined in a separate file to avoid a circular import between
 * regular-booking.module.ts and regular-booking.service.ts.
 */
export const WEBHOOK_PRODUCER = "WEBHOOK_PRODUCER";
