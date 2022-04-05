import { CreditCardIcon, KeyIcon, UserGroupIcon, UserIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import React from "react";

import LicenseRequired from "@ee/components/LicenseRequired";

import ErrorBoundary from "@lib/ErrorBoundary";
import { useLocale } from "@lib/hooks/useLocale";

import NavTabs from "./NavTabs";

export default function SettingsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const { asPath } = useRouter();

  console.log("asPath", asPath);

  const tabs = [
    {
      name: t("profile"),
      href: "/settings/profile",
      icon: UserIcon,
    },
    {
      name: t("security"),
      href: "/settings/security",
      icon: KeyIcon,
    },
    {
      name: t("teams"),
      href: "/settings/teams",
      icon: UserGroupIcon,
    },
    {
      name: t("billing"),
      href: "/settings/billing",
      icon: CreditCardIcon,
    },
  ];

  const Wrapper = LicenseRequired;

  return (
    <>
      <div className="sm:mx-auto">
        <NavTabs tabs={tabs} />
      </div>
      <Wrapper>
        <main className="max-w-4xl">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </Wrapper>
    </>
  );
}
