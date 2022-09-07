import React, { ComponentProps, useState } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/v2/core/Button";

import { Icon } from "../../../Icon";
import { useMeta } from "../Meta";
import Shell from "../Shell";
import VerticalTabs, { VerticalTabItem } from "../navigation/tabs/VerticalTabs";

const tabs = [
  {
    name: "my_account",
    href: "/settings/my-account",
    icon: Icon.FiUser,
    children: [
      { name: "profile", href: "/settings/my-account/profile" },
      { name: "general", href: "/settings/my-account/general" },
      { name: "calendars", href: "/settings/my-account/calendars" },
      { name: "conferencing", href: "/settings/my-account/conferencing" },
      { name: "appearance", href: "/settings/my-account/appearance" },
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
      { name: "password", href: "/settings/security/password" },
      { name: "2fa_auth", href: "/settings/security/two-factor-auth" },
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
      { name: "webhooks", href: "/settings/developer/webhooks" },
      { name: "api_keys", href: "/settings/developer/api_keys" },
      { name: "embeds", href: "/settings/developer/embeds" },
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
      { name: "impersonation", href: "/settings/admin/impersonation" },
      { name: "apps", href: "/settings/admin/apps" },
      { name: "users", href: "/settings/admin/users" },
    ],
  },
];

const SettingsSidebarContainer = ({ className = "" }) => {
  return (
    <VerticalTabs tabs={tabs} className={`py-3 pl-3 ${className}`}>
      <VerticalTabItem
        name="Settings"
        href="/"
        icon={Icon.FiArrowLeft}
        textClassNames="text-md font-medium leading-none text-black"
        className="mb-1"
      />
    </VerticalTabs>
  );
};

const MobileSettingsContainer = (props: { onSideContainerOpen?: () => void }) => {
  const { t } = useLocale();

  return (
    <>
      <nav className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4 lg:hidden">
        <div className=" flex items-center space-x-3 ">
          <Button
            StartIcon={Icon.FiMenu}
            color="minimalSecondary"
            size="icon"
            onClick={props.onSideContainerOpen}
          />
          <a href="/" className="flex items-center space-x-2 rounded-md px-3 py-1 hover:bg-gray-200">
            <Icon.FiArrowLeft className="text-gray-700" />
            <p className="font-semibold text-black">{t("settings")}</p>
          </a>
        </div>
      </nav>
    </>
  );
};

export default function SettingsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  const state = useState(false);
  const [sideContainerOpen, setSideContainerOpen] = state;
  return (
    <Shell
      flexChildrenContainer
      {...rest}
      SidebarContainer={<SettingsSidebarContainer className="hidden lg:flex" />}
      drawerState={state}
      MobileNavigationContainer={null}
      SettingsSidebarContainer={
        <div
          className={classNames(
            "absolute inset-y-0 z-50 m-0 h-screen transform overflow-y-scroll border-gray-100 bg-gray-50 transition duration-200 ease-in-out",
            sideContainerOpen ? "translate-x-0" : "-translate-x-full"
          )}>
          <SettingsSidebarContainer />
        </div>
      }
      TopNavContainer={
        <MobileSettingsContainer onSideContainerOpen={() => setSideContainerOpen(!sideContainerOpen)} />
      }>
      <div className="flex flex-1 [&>*]:flex-1">
        <div className="color-black mt-8 justify-center px-4 sm:px-6 md:px-8 ">
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
    <header className="mx-auto block max-w-4xl justify-between sm:flex md:px-12 md:pt-8">
      <div className="mb-8 w-full border-b border-gray-200 pb-8">
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
