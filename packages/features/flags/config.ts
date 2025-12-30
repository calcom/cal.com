/**
 * Right now we only support boolean flags.
 * Maybe later on we can add string variants or numeric ones
 **/
export type AppFlags = {
  "calendar-cache": boolean;
  "calendar-cache-serve": boolean;
  emails: boolean;
  insights: boolean;
  teams: boolean;
  webhooks: boolean;
  workflows: boolean;
  organizations: boolean;
  "email-verification": boolean;
  "google-workspace-directory": boolean;
  "disable-signup": boolean;
  attributes: boolean;
  "organizer-request-email-v2": boolean;
  "delegation-credential": boolean;
  "salesforce-crm-tasker": boolean;
  "workflow-smtp-emails": boolean;
  "cal-video-log-in-overlay": boolean;
  "use-api-v2-for-team-slots": boolean;
  pbac: boolean;
  "restriction-schedule": boolean;
  "team-booking-page-cache": boolean;
  "cal-ai-voice-agents": boolean;
  "tiered-support-chat": boolean;
  "calendar-subscription-cache": boolean;
  "calendar-subscription-sync": boolean;
  "onboarding-v3": boolean;
  "booker-botid": boolean;
  "booking-calendar-view": boolean;
  "booking-email-sms-tasker": boolean;
  "bookings-v3": boolean;
  "booking-audit": boolean;
};

export type TeamFeatures = Record<keyof AppFlags, boolean>;

export type FeatureState = "enabled" | "disabled" | "inherit";
