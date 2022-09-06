import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../../../Icon";

const settingsTabs = [
  {
    name: "my_account",
    href: "/settings/my-account",
    icon: Icon.FiUser,
    children: [
      { name: "profile", href: "/v2/settings/my-account/profile" },
      { name: "general", href: "/v2/settings/my-account/general" },
      { name: "calendars", href: "/v2/settings/my-account/calendars" },
      { name: "conferencing", href: "/v2/settings/my-account/conferencing" },
      { name: "appearance", href: "/v2/settings/my-account/appearance" },
      // TODO
      // { name: "referrals", href: "/settings/my-account/referrals" },
    ],
  },
  {
    name: "security",
    href: "/settings/security",
    icon: Icon.FiKey,
    children: [
      //
      { name: "password", href: "/v2/settings/security/password" },
      { name: "2fa_auth", href: "/v2/settings/security/two-factor-auth" },
    ],
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: Icon.FiCreditCard,
    children: [
      //
      { name: "invoices", href: "/v2/settings/billing" },
    ],
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: Icon.FiTerminal,
    children: [
      //
      { name: "webhooks", href: "/v2/settings/developer/webhooks" },
      { name: "api_keys", href: "/v2/settings/developer/api_keys" },
      { name: "embeds", href: "/v2/settings/developer/embeds" },
    ],
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: Icon.FiUsers,
    children: [],
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: Icon.FiLock,
    adminRequired: true,
    children: [
      //
      { name: "impersonation", href: "/v2/settings/admin/impersonation" },
      { name: "apps", href: "/v2/settings/admin/apps" },
      { name: "users", href: "/v2/settings/admin/users" },
    ],
  },
];

const SettingsSidebarContainer = () => {
  const { t } = useLocale();

  return (
    <nav className="no-scrollbar w-56 flex-col space-y-1 py-3 px-3" aria-label="Tabs">
      <div className="mt-7 mb-6 ml-4 flex items-center space-x-3">
        <a href={`${WEBAPP_URL}`}>
          <Icon.FiArrowLeft />
        </a>
        <p className="font-semibold">{t("settings")}</p>
      </div>
      {settingsTabs.map((section, index) => (
        <div key={section.name} className={classNames("ml-4", index !== 0 && "pt-3")}>
          <div className="flex">
            <section.icon />
            <p className="ml-3 text-sm font-medium leading-5 text-gray-600">{t(section.name)}</p>
          </div>
          {section.children?.map((child) => (
            <div key={child.name} className="ml-10 py-0.5">
              <a className="text-sm font-medium text-gray-900" href={child.href}>
                {t(child.name)}
              </a>
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
};

export default SettingsSidebarContainer;
