export const other = "None";

export const URL_PARAM_ENUMS: string[] = [
  "/apps",
  "/apps/routing-forms/forms",
  "/auth/setup?step=1",
  "/availability",
  "/bookings/upcoming",
  "/bookings/recurring",
  "/bookings/past",
  "/bookings/cancelled",
  "/event-types",
  "/insights",
  "/settings/my-account/profile",
  "/settings/my-account/general",
  "/settings/my-account/appearance",
  "/settings/teams",
  "/settings/security/password",
  "/settings/security/two-factor-auth",
  "/settings/security/impersonation",
  "/settings/developer/webhooks",
  "/settings/developer/api-keys",
  "/settings/billing",
  "/teams",
  "/workflows",
  other,
];

export const URL_PARAM_MSGS: string[] = URL_PARAM_ENUMS.map((x) => `Going to ${x}`);

export const EXTERNAL_LINK_ENUMS: string[] = [
  "https://cal.com/download",
  "https://discord.com/invite/calcom",
  "https://github.com/calcom/cal.com/milestones",
  "https://www.youtube.com/watch?v=jvaBafzVUQc",
  other,
];

export const EXTERNAL_LINK_MSGS: string[] = EXTERNAL_LINK_ENUMS.map(
  (x) => `You can review this webpage: ${x}`
);
