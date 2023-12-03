const other = "None";

export const ROUTER_ENUMS: string[] = [
  "/workflows",
  "/event-types",
  "/apps",
  "/bookings/upcoming",
  "/bookings/recurring",
  "/bookings/past",
  "/bookings/cancelled",
  "/availability",
  "/settings/my-account/profile",
  "/settings/my-account/general",
  "/settings/my-account/appearance",
  "/settings/teams",
  "/settings/security/password",
  "/settings/security/two-factor-auth",
  "/settings/security/impersonation",
  "/auth/setup?step=1",
  "/settings/developer/webhooks",
  "/settings/developer/api-keys",
  "/settings/billing",
  other,
];

export const ROUTER_MSGS: string[] = ROUTER_ENUMS.map((x) => `Going to ${x}`);
