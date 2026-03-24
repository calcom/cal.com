import type { IconName } from "@calcom/ui/components/icon/icon-names";

type SectionVisibility = "always" | "org" | "admin";

export interface SettingsItem {
  titleKey: string;
  descriptionKey: string;
  icon: IconName;
  href: string;
  isExternalLink?: boolean;
  keywords?: string[];
}

export interface SettingsSection {
  sectionTitleKey: string;
  visibility: SectionVisibility;
  items: SettingsItem[];
}

export const settingsSections: SettingsSection[] = [
  {
    sectionTitleKey: "personal_settings",
    visibility: "always",
    items: [
      {
        titleKey: "profile",
        descriptionKey: "settings_home_profile_description",
        icon: "user",
        href: "/settings/my-account/profile",
        keywords: ["name", "username", "bio", "avatar", "photo", "picture", "email"],
      },
      {
        titleKey: "general",
        descriptionKey: "settings_home_general_description",
        icon: "settings",
        href: "/settings/my-account/general",
        keywords: [
          "timezone",
          "time zone",
          "language",
          "locale",
          "week start",
          "time format",
          "date format",
          "24 hour",
          "12 hour",
          "dynamic links",
          "search engine indexing",
          "seo indexing",
          "seo",
          "email verification",
        ],
      },
      {
        titleKey: "calendars",
        descriptionKey: "settings_home_calendars_description",
        icon: "calendar",
        href: "/settings/my-account/calendars",
        keywords: ["google", "outlook", "apple", "calendar sync", "connected calendars", "icloud"],
      },
      {
        titleKey: "conferencing",
        descriptionKey: "settings_home_conferencing_description",
        icon: "video",
        href: "/settings/my-account/conferencing",
        keywords: ["zoom", "google meet", "teams", "video", "conferencing apps", "daily", "cal video"],
      },
      {
        titleKey: "out_of_office",
        descriptionKey: "settings_home_out_of_office_description",
        icon: "calendar-x-2",
        href: "/settings/my-account/out-of-office",
        keywords: ["vacation", "away", "redirect", "unavailable", "ooo", "holiday", "time off"],
      },
      {
        titleKey: "manage_billing",
        descriptionKey: "settings_home_billing_description",
        icon: "credit-card",
        href: "/settings/billing",
        keywords: ["subscription", "payment", "credit card", "invoice", "charges"],
      },
      {
        titleKey: "plans",
        descriptionKey: "settings_home_plans_description",
        icon: "layers",
        href: "/settings/billing/plans",
        keywords: ["upgrade", "downgrade", "pricing", "features", "team", "enterprise", "organization"],
      },
      {
        titleKey: "appearance",
        descriptionKey: "settings_home_appearance_description",
        icon: "paintbrush",
        href: "/settings/my-account/appearance",
        keywords: ["theme", "dark mode", "light mode", "brand color", "booking page", "logo", "branding"],
      },
      {
        titleKey: "push_notifications",
        descriptionKey: "settings_home_push_notifications_description",
        icon: "bell",
        href: "/settings/my-account/push-notifications",
        keywords: ["mobile", "alerts", "reminders", "notifications"],
      },
      {
        titleKey: "features",
        descriptionKey: "settings_home_features_description",
        icon: "sparkles",
        href: "/settings/my-account/features",
        keywords: ["beta", "experimental", "opt-in", "new features"],
      },
    ],
  },
  {
    sectionTitleKey: "security",
    visibility: "always",
    items: [
      {
        titleKey: "password",
        descriptionKey: "settings_home_password_description",
        icon: "key",
        href: "/settings/security/password",
        keywords: ["change password", "reset password", "update password"],
      },
      {
        titleKey: "impersonation",
        descriptionKey: "settings_home_impersonation_description",
        icon: "venetian-mask",
        href: "/settings/security/impersonation",
        keywords: ["allow impersonation", "admin access", "support access"],
      },
      {
        titleKey: "two_factor_auth",
        descriptionKey: "settings_home_2fa_description",
        icon: "lock",
        href: "/settings/security/two-factor-auth",
        keywords: ["2fa", "authenticator", "security key", "totp", "mfa", "multi-factor"],
      },
      {
        titleKey: "compliance",
        descriptionKey: "settings_home_compliance_description",
        icon: "shield-check",
        href: "/settings/security/compliance",
        keywords: ["data protection"],
      },
    ],
  },
  {
    sectionTitleKey: "organization_settings",
    visibility: "org",
    items: [
      {
        titleKey: "profile",
        descriptionKey: "settings_home_org_profile_description",
        icon: "building",
        href: "/settings/organizations/profile",
        keywords: ["organization name", "org logo", "organization profile"],
      },
      {
        titleKey: "general",
        descriptionKey: "settings_home_org_general_description",
        icon: "settings",
        href: "/settings/organizations/general",
        keywords: ["organization settings", "org settings"],
      },
      {
        titleKey: "guest_notifications",
        descriptionKey: "settings_home_org_guest_notifications_description",
        icon: "bell",
        href: "/settings/organizations/guest-notifications",
        keywords: ["guest emails", "attendee notifications"],
      },
      {
        titleKey: "attributes",
        descriptionKey: "settings_home_org_attributes_description",
        icon: "tags",
        href: "/settings/organizations/attributes",
        keywords: ["custom attributes", "user attributes", "member attributes"],
      },
      {
        titleKey: "privacy_and_security",
        descriptionKey: "settings_home_org_privacy_description",
        icon: "lock",
        href: "/settings/organizations/privacy",
        keywords: ["organization privacy", "org security"],
      },
      {
        titleKey: "manage_billing",
        descriptionKey: "settings_home_org_billing_description",
        icon: "credit-card",
        href: "/settings/organizations/billing",
        keywords: ["organization billing", "org subscription", "org payment"],
      },
      {
        titleKey: "roles",
        descriptionKey: "settings_home_org_roles_description",
        icon: "shield",
        href: "/settings/organizations/roles",
        keywords: ["permissions", "access control", "admin", "member roles"],
      },
      {
        titleKey: "features",
        descriptionKey: "settings_home_org_features_description",
        icon: "sparkles",
        href: "/settings/organizations/features",
        keywords: ["organization features", "org beta", "org opt-in"],
      },
      {
        titleKey: "single_sign_on",
        descriptionKey: "settings_home_org_sso_description",
        icon: "lock",
        href: "/settings/organizations/sso",
        keywords: ["sso", "saml", "okta", "azure ad", "identity provider"],
      },
      {
        titleKey: "directory_sync",
        descriptionKey: "settings_home_org_dsync_description",
        icon: "arrow-left-right",
        href: "/settings/organizations/dsync",
        keywords: ["scim", "user provisioning", "directory sync", "auto provision"],
      },
    ],
  },
  {
    sectionTitleKey: "developer",
    visibility: "always",
    items: [
      {
        titleKey: "webhooks",
        descriptionKey: "settings_home_webhooks_description",
        icon: "webhook",
        href: "/settings/developer/webhooks",
        keywords: ["integrations", "automation", "triggers", "events", "http callbacks"],
      },
      {
        titleKey: "api_keys",
        descriptionKey: "settings_home_api_keys_description",
        icon: "code",
        href: "/settings/developer/api-keys",
        keywords: ["developer", "access token", "api access", "api key"],
      },
      {
        titleKey: "oauth_clients",
        descriptionKey: "settings_home_oauth_description",
        icon: "globe",
        href: "/settings/developer/oauth",
        keywords: ["apps", "third party", "authorization", "oauth apps"],
      },
    ],
  },
];
