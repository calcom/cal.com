import { WrongAssignmentWebhookDataFetcher } from "@calcom/features/webhooks/lib/service/data-fetchers/WrongAssignmentWebhookDataFetcher";
import { createModule } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { DI_TOKENS } from "../../tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

export const wrongAssignmentWebhookDataFetcherModule = createModule();

wrongAssignmentWebhookDataFetcherModule
  .bind(WEBHOOK_TOKENS.WRONG_ASSIGNMENT_DATA_FETCHER)
  .toClass(WrongAssignmentWebhookDataFetcher, [
    SHARED_TOKENS.LOGGER,
    DI_TOKENS.BOOKING_REPOSITORY,
    DI_TOKENS.USER_REPOSITORY,
    DI_TOKENS.WRONG_ASSIGNMENT_REPORT_REPOSITORY,
  ]);
