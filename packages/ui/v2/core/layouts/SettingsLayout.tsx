import React, { ComponentProps } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../../../Icon";
import { useMeta } from "../Meta";
import Shell from "../Shell";
import { VerticalTabItem } from "../navigation/tabs";
import VerticalTabs from "../navigation/tabs/VerticalTabs";

export const settingsTabs = [
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

export default function SettingsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell
      flexChildrenContainer
      {...rest}
      SidebarContainer={
        <>
          <VerticalTabs tabs={settingsTabs} className="hidden py-3 pl-3 lg:flex">
            <VerticalTabItem
              name="Settings"
              href="/"
              icon={Icon.FiArrowLeft}
              textClassNames="text-md font-medium leading-none text-black"
              className="mb-1"
            />
          </VerticalTabs>
        </>
      }>
      <div className="flex-1 [&>*]:flex-1">
        <div className="mt-8 justify-center px-4 sm:px-6 md:px-8">
          <ShellHeader />
          {children}
        </div>
      </div>
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <SettingsLayout>{page}</SettingsLayout>;

function ShellHeader() {
  const { meta } = useMeta();
  const { t, isLocaleReady } = useLocale();
  return (
    <header className="mx-auto block max-w-4xl justify-between sm:flex lg:px-12 lg:pt-8">
      <div className="mb-8 w-full border-b border-gray-200 pb-8 lg:mb-0">
        {meta.title && isLocaleReady ? (
          <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-black">
            {t(meta.title)}
          </h1>
        ) : (
          <div className="mb-1 h-6 w-24 animate-pulse rounded-md bg-gray-200" />
        )}
        {meta.description && isLocaleReady ? (
          <p className="text-sm text-gray-600 ltr:mr-4 rtl:ml-4">{t(meta.description)}</p>
        ) : (
          <div className="mb-1 h-6 w-32 animate-pulse rounded-md bg-gray-200" />
        )}
      </div>
    </header>
  );
}
