import React, { ComponentProps } from "react";

import { Icon } from "../../../Icon";
import Shell from "../Shell";
import { VerticalTabItem } from "../navigation/tabs";
import VerticalTabs from "../navigation/tabs/VerticalTabs";

const tabs = [
  {
    name: "my_account",
    href: "/settings/profile",
    icon: Icon.FiUser,
    children: [
      { name: "profile", href: "/settings/my-account/profile" },
      { name: "general", href: "/settings/my-account/general" },
      { name: "calendars", href: "/settings/my-account/calendars" },
      { name: "conferencing", href: "/settings/my-account/conferencing" },
      { name: "appearance", href: "/settings/my-account/appearance" },
      // TODO
      { name: "referrals", href: "/settings/my-account/referrals" },
    ],
  },
  {
    name: "security",
    href: "/settings/security",
    icon: Icon.FiKey,
    children: [
      //
      { name: "password", href: "/settings/security" },
      { name: "2fa_auth", href: "/settings/security" },
    ],
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: Icon.FiCreditCard,
    children: [
      //
      { name: "invoices", href: "/settings/billing" },
    ],
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: Icon.FiTerminal,
    children: [
      //
      { name: "webhooks", href: "/settings/developer" },
      { name: "api_keys", href: "/settings/developer" },
      { name: "embeds", href: "/settings/developer" },
    ],
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: Icon.FiUsers,
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: Icon.FiLock,
    adminRequired: true,
    children: [
      //
      { name: "impersonation", href: "/settings/admin/impersonation" },
      { name: "apps", href: "/settings/admin/apps" },
      { name: "users", href: "/settings/admin/users" },
    ],
  },
];

export default function SettingsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell
      flexChildrenContainer
      {...rest}
      SidebarContainer={
        <VerticalTabs tabs={tabs} className="py-3 pl-3">
          <VerticalTabItem
            name="Settings"
            href="/"
            icon={Icon.FiArrowLeft}
            textClassNames="text-md font-medium leading-none text-black"
            className="mb-1"
          />
        </VerticalTabs>
      }>
      <div className="flex-1 [&>*]:flex-1">{children}</div>
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <SettingsLayout>{page}</SettingsLayout>;
