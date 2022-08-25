import React, { ComponentProps } from "react";

import { Icon } from "../../../Icon";
import Shell from "../Shell";
import VerticalTabs from "../navigation/tabs/VerticalTabs";

const tabs = [
  {
    name: "my_account",
    href: "/settings/profile",
    icon: Icon.FiUser,
    children: [
      { name: "profile", href: "/settings/profile" },
      { name: "general", href: "/settings/profile" },
      { name: "calendars", href: "/settings/profile" },
      { name: "conferencing", href: "/settings/profile" },
      { name: "appearance", href: "/settings/profile" },
      { name: "referrals", href: "/settings/profile" },
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
    <Shell {...rest}>
      <div className="flex-grow-0 bg-gray-50 p-2">
        <VerticalTabs tabs={tabs} />
      </div>
      <div className="flex-1 [&>*]:flex-1">{children}</div>
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <SettingsLayout>{page}</SettingsLayout>;
