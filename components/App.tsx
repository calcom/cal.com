import { ChevronLeftIcon } from "@heroicons/react/solid";
import Link from "next/link";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";

import NavTabs from "@components/NavTabs";
import Shell from "@components/Shell";

export default function App({
  name,
  logo,
  description,
  category,
  author,
}: {
  name: string;
  logo: string;
  description: React.ReactNode;
  category: string;
  author: string;
}) {
  const { t } = useLocale();
  const tabs = [
    {
      name: t("description"),
      href: "?description",
    },
    {
      name: t("features"),
      href: "?features",
    },
    {
      name: t("permissions"),
      href: "?permissions",
    },
    {
      name: t("terms_and_privacy"),
      href: "?terms",
    },
  ];

  return (
    <>
      <Shell large>
        <div className="-mx-8">
          <div className="px-10 bg-gray-50">
            <Link href="/apps">
              <a className="inline-flex px-1 py-2 mt-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                <ChevronLeftIcon className="w-5 h-5" /> {t("browse_apps")}
              </a>
            </Link>
            <div className="flex py-8">
              <img src={logo} />
              <header className="p-4">
                <h1 className="text-xl text-gray-900 font-cal">{name}</h1>
                <h2 className="text-sm text-gray-500">
                  <span className="capitalize">{category}</span> • {t("build_by", { author })}
                </h2>
              </header>
            </div>
            <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
          </div>

          <div className="px-10 py-10">
            <div className="prose-sm prose">{description}</div>
          </div>
        </div>
      </Shell>
    </>
  );
}
