import React, { ComponentProps, useState } from "react";

import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/v2/core/Button";

import { Icon } from "../../../Icon";
import { useMeta } from "../Meta";
import Shell from "../Shell";

const tabs = [
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
      {tabs.map((section, index) => (
        <div key={section.name} className={classNames("ml-4", index !== 0 && "pt-3")}>
          <div className="flex">
            <section.icon />
            <p className="ml-3 text-sm font-medium leading-5 text-gray-600">{t(section.name)}</p>
          </div>
          {section?.children?.map((child) => (
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
      SidebarContainer={
        <div className="hidden lg:block">
          <SettingsSidebarContainer />
        </div>
      }
      drawerState={state}
      MobileNavigationContainer={null}
      SettingsSidebarContainer={<SettingsSidebarContainer />}
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
