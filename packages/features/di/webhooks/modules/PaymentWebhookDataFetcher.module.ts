import { PaymentWebhookDataFetcher } from "@calcom/features/webhooks/lib/service/data-fetchers/PaymentWebhookDataFetcher";
import { createModule } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

export const paymentWebhookDataFetcherModule = createModule();

paymentWebhookDataFetcherModule
  .bind(WEBHOOK_TOKENS.PAYMENT_DATA_FETCHER)
  .toClass(PaymentWebhookDataFetcher, [SHARED_TOKENS.LOGGER]);
