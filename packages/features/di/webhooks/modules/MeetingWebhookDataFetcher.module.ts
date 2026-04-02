import { MeetingWebhookDataFetcher } from "@calcom/features/webhooks/lib/service/data-fetchers/MeetingWebhookDataFetcher";
import { createModule, type Module } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { DI_TOKENS } from "../../tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

const meetingWebhookDataFetcherModule: Module = createModule();

meetingWebhookDataFetcherModule
  .bind(WEBHOOK_TOKENS.MEETING_DATA_FETCHER)
  .toClass(MeetingWebhookDataFetcher, [SHARED_TOKENS.LOGGER, DI_TOKENS.BOOKING_REPOSITORY]);

export { meetingWebhookDataFetcherModule };
