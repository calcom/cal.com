import { FormWebhookDataFetcher } from "@calcom/features/webhooks/lib/service/data-fetchers/FormWebhookDataFetcher";
import { createModule } from "@evyweb/ioctopus";
import { DI_TOKENS } from "../../tokens";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

export const formWebhookDataFetcherModule = createModule();

formWebhookDataFetcherModule
  .bind(WEBHOOK_TOKENS.FORM_DATA_FETCHER)
  .toClass(FormWebhookDataFetcher, [SHARED_TOKENS.LOGGER, DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY]);
