import { OOOWebhookDataFetcher } from "@calcom/features/webhooks/lib/service/data-fetchers/OOOWebhookDataFetcher";
import { createModule } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

export const oooWebhookDataFetcherModule = createModule();

oooWebhookDataFetcherModule
  .bind(WEBHOOK_TOKENS.OOO_DATA_FETCHER)
  .toClass(OOOWebhookDataFetcher, [SHARED_TOKENS.LOGGER]);
