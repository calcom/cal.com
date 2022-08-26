import Link from "next/link";
import { Toaster } from "react-hot-toast";

import TrialBanner from "@calcom/features/ee/common/components/TrialBanner";
import ImpersonatingBanner from "@calcom/features/ee/impersonation/components/ImpersonatingBanner";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { Icon } from "@calcom/ui";
import ErrorBoundary from "@calcom/ui/ErrorBoundary";
import { KBarRoot, KBarContent, KBarTrigger } from "@calcom/ui/Kbar";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";
import {
  useRedirectToLoginIfUnauthenticated,
  useRedirectToOnboardingIfNeeded,
  CustomBrandingContainer,
  DeploymentInfo,
} from "@calcom/ui/v2/core/Shell";
import HeadSeo from "@calcom/ui/v2/core/head-seo";
import Tips from "@calcom/ui/v2/modules/tips/Tips";

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
      // { name: "referrals", href: "/settings/my-account/referrals" },
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

const Layout = (props) => {
  const { t } = useLocale();
  const pageTitle = typeof props.heading === "string" ? props.heading : props.title;

  return (
    <>
      <HeadSeo
        title={pageTitle ?? "Cal.com"}
        description={props.subtitle ? props.subtitle?.toString() : ""}
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div>
        <Toaster position="bottom-right" />
      </div>

      <div className="flex h-screen overflow-hidden" data-testid="dashboard-shell">
        <aside className="hidden w-14 flex-col border-r border-gray-100 bg-gray-50 px-2 lg:flex lg:w-56 lg:flex-shrink-0 lg:px-4">
          <div className="flex h-0 flex-1 flex-col overflow-y-auto pt-3 pb-4 lg:pt-5">
            <div className="mb-8 items-center space-x-2 md:hidden lg:flex">
              <Icon.FiArrowLeft className="text-gray-700" />
              <p className="font-semibold text-black">{t("settings")}</p>
            </div>
            {tabs.map((section) => {
              return (
                <>
                  <div key={section.name} className="mb-2 flex items-center space-x-4">
                    <section.icon className="text-gray-500" />
                    <p className="text-gray-600">{t(section.name)}</p>
                  </div>
                  <ul className="ml-8 mb-2">
                    {section?.children.map((child) => {
                      return (
                        <li key={child.name} className="mb-2 text-gray-900">
                          <Link href={`${WEBAPP_URL}/v2/${child.href}`}>{t(child.name)}</Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              );
            })}
            {/* <nav className="mt-2 flex-1 space-y-1 lg:mt-5">
              {tabs.map((item) => (
                {item.name}
              ))}
              <span className="group flex items-center rounded-sm px-2 py-2 text-sm font-medium text-neutral-500 hover:bg-gray-50 hover:text-neutral-900 lg:hidden">
                <KBarTrigger />
              </span>
            </nav> */}
          </div>

          <Tips />

          <TrialBanner />

          <DeploymentInfo />
        </aside>
        <div className="flex w-0 flex-1 flex-col overflow-hidden">
          <ErrorBoundary>
            <main className="relative z-0 flex flex-1 flex-col overflow-y-auto bg-white focus:outline-none lg:px-12 lg:py-8">
              <nav className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4 lg:hidden">
                <div className=" flex items-center space-x-2 ">
                  <Icon.FiArrowLeft className="text-gray-700" />
                  <p className="font-semibold text-black">{t("settings")}</p>
                </div>
                <div className="flex items-center gap-2 self-center">
                  {/* <button className="rounded-full bg-white p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
                    <span className="sr-only">{t("settings")}</span> */}
                  <Dropdown>
                    <DropdownMenuTrigger className="border hover:bg-gray-300">
                      <Icon.FiMenu />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <div className="w-56 border-gray-100 bg-gray-50 p-4">
                        {tabs.map((section) => {
                          return (
                            <div key={section.name} className="my-4">
                              <div className="mb-2 flex  items-center space-x-4">
                                <section.icon className="text-gray-500" />
                                <p className="text-gray-600">{t(section.name)}</p>
                              </div>
                              <div className="ml-8 mb-2">
                                {section?.children.map((child) => {
                                  return (
                                    <DropdownMenuItem key={child.name} className="mb-2 text-gray-900">
                                      <Link className="w-auto" href={`${WEBAPP_URL}/v2/${child.href}`}>
                                        <p>{t(child.name)}</p>
                                      </Link>
                                    </DropdownMenuItem>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </Dropdown>
                  {/* </button> */}
                </div>
              </nav>

              <div className="flex items-center bg-white px-2 pl-12 pt-4 lg:py-8">
                <div className="w-full">
                  <>
                    <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-black">
                      {props.heading}
                    </h1>

                    <p className="text-sm text-neutral-500 ltr:mr-4 rtl:ml-4">{props.subtitle}</p>
                  </>
                </div>
                {props.CTA && <div className="mb-4 flex-shrink-0">{props.CTA}</div>}
              </div>

              <hr className="border-1 mt-6 mb-9 border-gray-200" />

              <div className="flex h-full flex-1 flex-col bg-white px-12">{props.children}</div>

              <ImpersonatingBanner />
            </main>
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
};

export default function Shell(props) {
  useRedirectToLoginIfUnauthenticated(props.isPublic);
  useRedirectToOnboardingIfNeeded();
  useTheme("light");

  return (
    <KBarRoot>
      <CustomBrandingContainer />
      <Layout {...props} />
      <KBarContent />
    </KBarRoot>
  );
}
