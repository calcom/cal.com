import type { AppFlags } from "@calcom/features/flags/config";
import { trpc } from "@calcom/trpc/react";

const initialData: AppFlags = {
  organizations: false,
  teams: false,
  "calendar-cache": false,
  "calendar-cache-serve": false,
  emails: false,
  insights: false,
  webhooks: false,
  workflows: false,
  "email-verification": false,
  "google-workspace-directory": false,
  "disable-signup": false,
  attributes: false,
  "organizer-request-email-v2": false,
  "delegation-credential": false,
  "salesforce-crm-tasker": false,
  "workflow-smtp-emails": false,
  "cal-video-log-in-overlay": false,
  "use-api-v2-for-team-slots": false,
  pbac: false,
  "restriction-schedule": false,
  "team-booking-page-cache": false,
  "cal-ai-voice-agents": false,
  "tiered-support-chat": false,
  "calendar-subscription-cache": false,
  "calendar-subscription-sync": false,
  "onboarding-v3": false,
  "booker-botid": false,
  "booking-calendar-view": false,
};

if (process.env.NEXT_PUBLIC_IS_E2E) {
  initialData.organizations = true;
  initialData.teams = true;
}

export function useFlags(): Partial<AppFlags> {
  const query = trpc.viewer.features.map.useQuery();
  return query.data ?? initialData;
}
