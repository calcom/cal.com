/**
 * Right now we only support boolean flags.
 * Maybe later on we can add string variants or numeric ones
 **/
export type AppFlags = {
  "calendar-cache": boolean;
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
  "domain-wide-delegation": boolean;
};
