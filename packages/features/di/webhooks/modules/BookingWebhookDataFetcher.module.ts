import { BookingWebhookDataFetcher } from "@calcom/features/webhooks/lib/service/data-fetchers/BookingWebhookDataFetcher";
import { createModule } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

export const bookingWebhookDataFetcherModule = createModule();

bookingWebhookDataFetcherModule
  .bind(WEBHOOK_TOKENS.BOOKING_DATA_FETCHER)
  .toClass(BookingWebhookDataFetcher, [SHARED_TOKENS.LOGGER]);
