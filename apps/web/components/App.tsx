import {
  BookOpenIcon,
  DocumentTextIcon,
  ExternalLinkIcon,
  FlagIcon,
  MailIcon,
  ShieldCheckIcon,
} from "@heroicons/react/outline";
import { ChevronLeftIcon } from "@heroicons/react/solid";
import Link from "next/link";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";

//import NavTabs from "@components/NavTabs";
import Shell from "@components/Shell";
import Badge from "@components/ui/Badge";
import Button from "@components/ui/Button";

export default function App({
  name,
  logo,
  body,
  categories,
  author,
  price,
  commission,
  type,
  docs,
  website,
  email,
  tos,
  privacy,
}: {
  name: string;
  logo: string;
  body: React.ReactNode;
  categories: string[];
  author: string;
  pro?: boolean;
  price: number;
  commission?: number;
  type?: "monthly" | "usage-based" | "one-time" | "free";
  docs?: string;
  website?: string;
  email: string; // required
  tos?: string;
  privacy?: string;
}) {
  const { t } = useLocale();

  /*const tabs = [
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
  ];*/

  const priceInDollar = Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    useGrouping: false,
  }).format(price);

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
                <img className="w-16 h-16" src={logo} />
                <header className="px-4 py-2">
                  <h1 className="text-xl text-gray-900 font-cal">{name}</h1>
                  <h2 className="text-sm text-gray-500">
                    <span className="capitalize">{categories[0]}</span> • {t("build_by", { author })}
                  </h2>
                </header>
              </div>

              <div className="text-right">
                {type === "free" && (
                  <Button onClick={() => alert("TODO: installed free app")}>{t("install_app")}</Button>
                )}

                {type === "usage-based" && (
                  <Button onClick={() => alert("TODO: installed usage based app")}>{t("install_app")}</Button>
                )}

                {type === "monthly" && (
                  <Button onClick={() => alert("TODO: installed monthly billed app")}>
                    {t("subscribe")}
                  </Button>
                )}

                {price !== 0 && (
                  <small className="block text-right">
                    {type === "usage-based"
                      ? commission + "% + " + priceInDollar + "/booking"
                      : priceInDollar}
                    {type === "monthly" && "/" + t("month")}
                  </small>
                )}
              </div>
            </div>
            {/* reintroduce once we show permissions and features
            <NavTabs tabs={tabs} linkProps={{ shallow: true }} /> */}
          </div>

          <div className="flex justify-between px-10 py-10">
            <div className="prose-sm prose">{body}</div>
            <div className="flex-1 max-w-80">
              <h4 className="font-medium text-gray-900 ">{t("categories")}</h4>
              <div className="space-x-2">
                {categories.map((category) => (
                  <Link href={"/apps/categories/" + category} key={category}>
                    <a>
                      <Badge variant="success">{category}</Badge>
                    </a>
                  </Link>
                ))}
              </div>
              <h4 className="mt-8 font-medium text-gray-900 ">{t("pricing")}</h4>
              <small>
                {price === 0 ? (
                  "Free"
                ) : (
                  <>
                    {Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      useGrouping: false,
                    }).format(price)}
                    {type === "monthly" && "/" + t("month")}
                  </>
                )}
              </small>
              <h4 className="mt-8 mb-2 font-medium text-gray-900 ">{t("learn_more")}</h4>
              <ul className="-ml-1 -mr-1 text-xs leading-5 prose">
                {docs && (
                  <li>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 no-underline hover:underline"
                      href={docs}>
                      <BookOpenIcon className="inline w-4 h-4 mr-1 -mt-1" />
                      {t("documentation")}
                    </a>
                  </li>
                )}
                {website && (
                  <li>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 no-underline hover:underline"
                      href={website}>
                      <ExternalLinkIcon className="inline w-4 h-4 mr-1 -mt-px" />
                      {website.replace("https://", "")}
                    </a>
                  </li>
                )}
                {email && (
                  <li>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 no-underline hover:underline"
                      href={"mailto:" + email}>
                      <MailIcon className="inline w-4 h-4 mr-1 -mt-px" />
                      {email}
                    </a>
                  </li>
                )}
                {tos && (
                  <li>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 no-underline hover:underline"
                      href={tos}>
                      <DocumentTextIcon className="inline w-4 h-4 mr-1 -mt-px" />
                      {t("terms_of_service")}
                    </a>
                  </li>
                )}
                {privacy && (
                  <li>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 no-underline hover:underline"
                      href={privacy}>
                      <ShieldCheckIcon className="inline w-4 h-4 mr-1 -mt-px" />
                      {t("privacy_policy")}
                    </a>
                  </li>
                )}
              </ul>
              <hr className="my-6" />
              <small className="block text-gray-500 leading-1">
                Every app published on the Cal.com App Store is open source and thoroughly tested via peer
                reviews. Nevertheless, Cal.com, Inc. does not endorse or certify these apps unless they are
                published by Cal.com. If you encounter inappropriate content or behaviour please report it.
              </small>
              <a className="block mt-2 text-xs text-red-500" href="mailto:help@cal.com">
                <FlagIcon className="inline w-3 h-3" /> Report App
              </a>
            </div>
          </div>
        </div>
      </Shell>
    </>
  );
}
