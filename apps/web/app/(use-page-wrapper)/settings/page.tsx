import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Card } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => ({
      title: t("settings"),
      description: t("settings_description", { appName: "Cal.com" }),
    }),
    ["settings", "settings_description"]
  );

const SettingsHomePage = async () => {
  const t = await getTranslate();

  const settingsCategories = [
    {
      name: "personal",
      title: t("personal"),
      items: [
        {
          name: "profile",
          title: t("profile"),
          description: t("profile_description"),
          href: "/settings/my-account/profile",
          icon: "user",
        },
        {
          name: "general",
          title: t("general"),
          description: t("general_description"),
          href: "/settings/my-account/general",
          icon: "settings",
        },
        {
          name: "calendars",
          title: t("calendars"),
          description: t("calendars_description"),
          href: "/settings/my-account/calendars",
          icon: "calendar",
        },
        {
          name: "conferencing",
          title: t("conferencing"),
          description: t("conferencing_description"),
          href: "/settings/my-account/conferencing",
          icon: "video",
        },
        {
          name: "appearance",
          title: t("appearance"),
          description: t("appearance_description"),
          href: "/settings/my-account/appearance",
          icon: "palette",
        },
        {
          name: "out_of_office",
          title: t("out_of_office"),
          description: t("out_of_office_description"),
          href: "/settings/my-account/out-of-office",
          icon: "beach",
        },
      ],
    },
    {
      name: "security",
      title: t("security"),
      items: [
        {
          name: "password",
          title: t("password"),
          description: t("password_description"),
          href: "/settings/security/password",
          icon: "key",
        },
        {
          name: "impersonation",
          title: t("impersonation"),
          description: t("impersonation_description"),
          href: "/settings/security/impersonation",
          icon: "users",
        },
        {
          name: "two_factor_auth",
          title: t("2fa"),
          description: t("2fa_description"),
          href: "/settings/security/two-factor-auth",
          icon: "shield",
        },
      ],
    },
    {
      name: "organization",
      title: t("organization"),
      items: [
        {
          name: "profile",
          title: t("profile"),
          description: t("org_profile_description"),
          href: "/settings/organizations/profile",
          icon: "building",
        },
        {
          name: "general",
          title: t("general"),
          description: t("org_general_description"),
          href: "/settings/organizations/general",
          icon: "settings",
        },
        {
          name: "members",
          title: t("members"),
          description: t("org_members_description"),
          href: "/settings/organizations/members",
          icon: "users",
        },
        {
          name: "teams",
          title: t("teams"),
          description: t("org_teams_description"),
          href: "/teams",
          icon: "users-2",
        },
      ],
    },
    {
      name: "developer",
      title: t("developer"),
      items: [
        {
          name: "webhooks",
          title: t("webhooks"),
          description: t("webhooks_description"),
          href: "/settings/developer/webhooks",
          icon: "link",
        },
        {
          name: "api_keys",
          title: t("api_keys"),
          description: t("api_keys_description"),
          href: "/settings/developer/api-keys",
          icon: "key",
        },
      ],
    },
  ];

  return (
    <SettingsHeader
      title={t("settings")}
      description={t("settings_home_description")}
      borderInShellHeader={true}>
      <div className="space-y-8 py-4">
        {settingsCategories.map((category) => (
          <div key={category.name} className="mb-10">
            <h2 className="text-emphasis mb-2 text-xl font-semibold">{category.title}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item) => (
                <Card
                  key={item.name}
                  variant="basic"
                  icon={<Icon name={item.icon} className="text-emphasis h-5 w-5 stroke-[2px]" />}
                  title={item.title}
                  description={item.description}
                  actionButton={{
                    href: item.href,
                    child: t("manage"),
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SettingsHeader>
  );
};

export default SettingsHomePage;
