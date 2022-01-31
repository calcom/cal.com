import { ChevronLeftIcon } from "@heroicons/react/solid";
import Link from "next/link";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";

import NavTabs from "@components/NavTabs";
import Shell from "@components/Shell";
import Badge from "@components/ui/Badge";
import Button from "@components/ui/Button";

export default function App({
  name,
  logo,
  description,
  categories,
  author,
  price,
  monthly,
}: {
  name: string;
  logo: string;
  description: React.ReactNode;
  categories: string[];
  author: string;
  pro?: boolean;
  price: number;
  monthly?: boolean;
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
            <div className="flex items-center justify-between py-8">
              <div className="flex">
                <img src={logo} />
                <header className="p-4">
                  <h1 className="text-xl text-gray-900 font-cal">{name}</h1>
                  <h2 className="text-sm text-gray-500">
                    <span className="capitalize">{categories[0]}</span> • {t("build_by", { author })}
                  </h2>
                </header>
              </div>

              <div>
                <Button>{price !== 0 ? (monthly ? t("subscribe") : t("buy")) : t("install_app")}</Button>
                {price !== 0 && (
                  <small className="block text-right">
                    {Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      useGrouping: false,
                    }).format(price)}
                    {monthly && "/" + t("month")}
                  </small>
                )}
              </div>
            </div>
            <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
          </div>

          <div className="flex justify-between px-10 py-10">
            <div className="prose-sm prose">{description}</div>
            <div className="flex-1 max-w-96">
              <h4 className="font-medium text-gray-900 ">Categories</h4>
              <div className="mb-8 space-x-2">
                {categories.map((category) => (
                  <Link href={"/apps/categories/" + category} key={category}>
                    <a>
                      <Badge variant="gray">{category}</Badge>
                    </a>
                  </Link>
                ))}
              </div>
              <h4 className="font-medium text-gray-900 ">Pricing</h4>
              <small className="block">
                {price === 0 ? (
                  "Free"
                ) : (
                  <>
                    {Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      useGrouping: false,
                    }).format(price)}
                    {monthly && "/" + t("month")}
                  </>
                )}
              </small>
            </div>
          </div>
        </div>
      </Shell>
    </>
  );
}
