import type { IconName } from "@calcom/ui/components/icon/icon-names";

type SectionVisibility = "always" | "org" | "admin";

export interface SettingsItem {
  titleKey: string;
  descriptionKey: string;
  icon: IconName;
  href: string;
  isExternalLink?: boolean;
}

export interface SettingsSection {
  sectionTitleKey: string;
  visibility: SectionVisibility;
  items: SettingsItem[];
}

export const settingsSections: SettingsSection[] = [
  {
    sectionTitleKey: "my_account",
    visibility: "always",
    items: [
      {
        titleKey: "profile",
        descriptionKey: "settings_home_profile_description",
        icon: "user",
        href: "/settings/my-account/profile",
      },
      {
        titleKey: "general",
        descriptionKey: "settings_home_general_description",
        icon: "sliders-horizontal",
        href: "/settings/my-account/general",
      },
      {
        titleKey: "calendars",
        descriptionKey: "settings_home_calendars_description",
        icon: "calendar",
        href: "/settings/my-account/calendars",
      },
      {
        titleKey: "conferencing",
        descriptionKey: "settings_home_conferencing_description",
        icon: "video",
        href: "/settings/my-account/conferencing",
      },
      {
        titleKey: "out_of_office",
        descriptionKey: "settings_home_out_of_office_description",
        icon: "clock",
        href: "/settings/my-account/out-of-office",
      },
      {
        titleKey: "manage_billing",
        descriptionKey: "settings_home_billing_description",
        icon: "credit-card",
        href: "/settings/billing",
      },
      {
        titleKey: "appearance",
        descriptionKey: "settings_home_appearance_description",
        icon: "paintbrush",
        href: "/settings/my-account/appearance",
      },
      {
        titleKey: "push_notifications",
        descriptionKey: "settings_home_push_notifications_description",
        icon: "bell",
        href: "/settings/my-account/push-notifications",
      },
      {
        titleKey: "features",
        descriptionKey: "settings_home_features_description",
        icon: "zap",
        href: "/settings/my-account/features",
      },
    ],
  },
  {
    sectionTitleKey: "privacy_and_security",
    visibility: "always",
    items: [
      {
        titleKey: "password",
        descriptionKey: "settings_home_password_description",
        icon: "key",
        href: "/settings/security/password",
      },
      {
        titleKey: "impersonation",
        descriptionKey: "settings_home_impersonation_description",
        icon: "venetian-mask",
        href: "/settings/security/impersonation",
      },
      {
        titleKey: "two_factor_auth",
        descriptionKey: "settings_home_2fa_description",
        icon: "fingerprint",
        href: "/settings/security/two-factor-auth",
      },
      {
        titleKey: "compliance",
        descriptionKey: "settings_home_compliance_description",
        icon: "shield-check",
        href: "/settings/security/compliance",
      },
    ],
  },
  {
    sectionTitleKey: "organization",
    visibility: "org",
    items: [
      {
        titleKey: "profile",
        descriptionKey: "settings_home_org_profile_description",
        icon: "building",
        href: "/settings/organizations/profile",
      },
      {
        titleKey: "general",
        descriptionKey: "settings_home_org_general_description",
        icon: "settings",
        href: "/settings/organizations/general",
      },
      {
        titleKey: "members",
        descriptionKey: "settings_home_org_members_description",
        icon: "users",
        href: "/settings/organizations/members",
        isExternalLink: true,
      },
      {
        titleKey: "attributes",
        descriptionKey: "settings_home_org_attributes_description",
        icon: "tags",
        href: "/settings/organizations/attributes",
      },
      {
        titleKey: "privacy",
        descriptionKey: "settings_home_org_privacy_description",
        icon: "lock",
        href: "/settings/organizations/privacy",
      },
      {
        titleKey: "manage_billing",
        descriptionKey: "settings_home_org_billing_description",
        icon: "credit-card",
        href: "/settings/organizations/billing",
      },
      {
        titleKey: "roles",
        descriptionKey: "settings_home_org_roles_description",
        icon: "shield",
        href: "/settings/organizations/roles",
      },
      {
        titleKey: "saml_sso",
        descriptionKey: "settings_home_org_sso_description",
        icon: "fingerprint",
        href: "/settings/organizations/sso",
      },
      {
        titleKey: "directory_sync",
        descriptionKey: "settings_home_org_dsync_description",
        icon: "refresh-cw",
        href: "/settings/organizations/dsync",
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
      },
      {
        titleKey: "api_keys",
        descriptionKey: "settings_home_api_keys_description",
        icon: "code",
        href: "/settings/developer/api-keys",
      },
      {
        titleKey: "oAuth",
        descriptionKey: "settings_home_oauth_description",
        icon: "globe",
        href: "/settings/developer/oauth",
      },
    ],
  },
  {
    sectionTitleKey: "admin",
    visibility: "admin",
    items: [
      {
        titleKey: "features",
        descriptionKey: "settings_home_admin_features_description",
        icon: "zap",
        href: "/settings/admin/flags",
      },
      {
        titleKey: "manage_billing",
        descriptionKey: "settings_home_admin_billing_description",
        icon: "credit-card",
        href: "/settings/admin/billing",
      },
      {
        titleKey: "impersonation",
        descriptionKey: "settings_home_admin_impersonation_description",
        icon: "venetian-mask",
        href: "/settings/admin/impersonation",
      },
      {
        titleKey: "users",
        descriptionKey: "settings_home_admin_users_description",
        icon: "users",
        href: "/settings/admin/users",
      },
      {
        titleKey: "organizations",
        descriptionKey: "settings_home_admin_organizations_description",
        icon: "building",
        href: "/settings/admin/organizations",
      },
    ],
  },
];
