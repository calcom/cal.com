import { RecordingWebhookDataFetcher } from "@calcom/features/webhooks/lib/service/data-fetchers/RecordingWebhookDataFetcher";
import { createModule } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

export const recordingWebhookDataFetcherModule = createModule();

recordingWebhookDataFetcherModule
  .bind(WEBHOOK_TOKENS.RECORDING_DATA_FETCHER)
  .toClass(RecordingWebhookDataFetcher, [SHARED_TOKENS.LOGGER]);
