import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Icon } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon/icon-names";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("settings"),
    (t) => t("settings_home_description")
  );

const SettingsHomePage = async () => {
  const t = await getTranslate();

  const personalSettings = [
    {
      name: "profile",
      title: t("profile"),
      description: t("profile_settings_description"),
      href: "/settings/my-account/profile",
      icon: "user" as IconName,
    },
    {
      name: "general",
      title: t("general"),
      description: t("general_settings_description"),
      href: "/settings/my-account/general",
      icon: "settings" as IconName,
    },
    {
      name: "calendar",
      title: t("calendar"),
      description: t("calendar_settings_description"),
      href: "/settings/my-account/calendars",
      icon: "calendar" as IconName,
    },
    {
      name: "conferencing",
      title: t("conferencing"),
      description: t("conferencing_settings_description"),
      href: "/settings/my-account/conferencing",
      icon: "video" as IconName,
    },
    {
      name: "out_of_office",
      title: t("out_of_office"),
      description: t("out_of_office_settings_description"),
      href: "/settings/my-account/out-of-office",
      icon: "beach" as IconName,
    },
    {
      name: "appearance",
      title: t("appearance"),
      description: t("appearance_settings_description"),
      href: "/settings/my-account/appearance",
      icon: "palette" as IconName,
    },
    {
      name: "billing",
      title: t("manage_billing"),
      description: t("billing_settings_description"),
      href: "/settings/billing",
      icon: "credit-card" as IconName,
    },
  ];

  const securitySettings = [
    {
      name: "password",
      title: t("password"),
      description: t("password_settings_description"),
      href: "/settings/security/password",
      icon: "key" as IconName,
    },
    {
      name: "impersonation",
      title: t("impersonation"),
      description: t("impersonation_settings_description"),
      href: "/settings/security/impersonation",
      icon: "users" as IconName,
    },
    {
      name: "2fa",
      title: t("2fa"),
      description: t("2fa_settings_description"),
      href: "/settings/security/two-factor-auth",
      icon: "lock" as IconName,
    },
  ];

  const organizationSettings = [
    {
      name: "profile",
      title: t("profile"),
      description: t("org_profile_settings_description"),
      href: "/settings/organizations/profile",
      icon: "building" as IconName,
    },
    {
      name: "general",
      title: t("general"),
      description: t("org_general_settings_description"),
      href: "/settings/organizations/general",
      icon: "settings" as IconName,
    },
    {
      name: "members",
      title: t("members"),
      description: t("members_settings_description"),
      href: "/settings/organizations/members",
      icon: "users" as IconName,
    },
    {
      name: "attributes",
      title: t("attributes"),
      description: t("attributes_settings_description"),
      href: "/settings/organizations/attributes",
      icon: "tag" as IconName,
    },
    {
      name: "oauth_clients",
      title: t("oauth_clients"),
      description: t("oauth_settings_description"),
      href: "/settings/organizations/oauth-clients",
      icon: "key" as IconName,
    },
    {
      name: "single_sign_on",
      title: t("single_sign_on"),
      description: t("sso_settings_description"),
      href: "/settings/organizations/sso",
      icon: "lock" as IconName,
    },
    {
      name: "directory_sync",
      title: t("directory_sync"),
      description: t("directory_sync_settings_description"),
      href: "/settings/organizations/directory-sync",
      icon: "refresh-ccw" as IconName,
    },
  ];

  const developerSettings = [
    {
      name: "webhooks",
      title: t("webhooks"),
      description: t("webhooks_settings_description"),
      href: "/settings/developer/webhooks",
      icon: "link" as IconName,
    },
  ];

  return (
    <SettingsHeader
      title={t("settings")}
      description={t("settings_home_description")}
      borderInShellHeader={true}>
      <div className="space-y-8 py-6">
        <div className="mb-8">
          <h2 className="text-emphasis mb-4 text-lg font-medium">{t("personal_settings")}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {personalSettings.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="hover:bg-subtle group flex items-center gap-4 rounded-md p-4 transition">
                <div className="bg-subtle text-emphasis flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md">
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-emphasis font-medium">{item.title}</h3>
                  <p className="text-default text-sm">{item.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-emphasis mb-4 text-lg font-medium">{t("security")}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {securitySettings.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="hover:bg-subtle group flex items-center gap-4 rounded-md p-4 transition">
                <div className="bg-subtle text-emphasis flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md">
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-emphasis font-medium">{item.title}</h3>
                  <p className="text-default text-sm">{item.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-emphasis mb-4 text-lg font-medium">{t("organization_settings")}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {organizationSettings.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="hover:bg-subtle group flex items-center gap-4 rounded-md p-4 transition">
                <div className="bg-subtle text-emphasis flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md">
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-emphasis font-medium">{item.title}</h3>
                  <p className="text-default text-sm">{item.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-emphasis mb-4 text-lg font-medium">{t("developer")}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {developerSettings.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="hover:bg-subtle group flex items-center gap-4 rounded-md p-4 transition">
                <div className="bg-subtle text-emphasis flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md">
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-emphasis font-medium">{item.title}</h3>
                  <p className="text-default text-sm">{item.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </SettingsHeader>
  );
};

export default SettingsHomePage;
