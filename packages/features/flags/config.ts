/**
 * Right now we only support boolean flags.
 * Maybe later on we can add string variants or numeric ones
 **/
export type AppFlags = {
  emails: boolean;
  teams: boolean;
  webhooks: boolean;
  workflows: boolean;
  "booking-page-v2": boolean;
};
