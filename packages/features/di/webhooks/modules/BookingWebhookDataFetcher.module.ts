import { BookingWebhookDataFetcher } from "@calcom/features/webhooks/lib/service/data-fetchers/BookingWebhookDataFetcher";
import { createModule, type Module } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { DI_TOKENS } from "../../tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

const bookingWebhookDataFetcherModule: Module = createModule();

bookingWebhookDataFetcherModule
  .bind(WEBHOOK_TOKENS.BOOKING_DATA_FETCHER)
  .toClass(BookingWebhookDataFetcher, [SHARED_TOKENS.LOGGER, DI_TOKENS.BOOKING_REPOSITORY]);

export { bookingWebhookDataFetcherModule };
