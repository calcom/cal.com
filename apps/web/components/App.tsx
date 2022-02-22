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
          <div className="bg-gray-50 px-10">
            <Link href="/apps">
              <a className="mt-2 inline-flex px-1 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                <ChevronLeftIcon className="h-5 w-5" /> {t("browse_apps")}
              </a>
            </Link>
            <div className="flex items-center justify-between py-8">
              <div className="flex">
                <img className="h-16 w-16" src={logo} alt="" />
                <header className="px-4 py-2">
                  <h1 className="font-cal text-xl text-gray-900">{name}</h1>
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
            <div className="max-w-80 flex-1">
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
              <ul className="prose -ml-1 -mr-1 text-xs leading-5">
                {docs && (
                  <li>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 no-underline hover:underline"
                      href={docs}>
                      <BookOpenIcon className="mr-1 -mt-1 inline h-4 w-4" />
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
                      <ExternalLinkIcon className="mr-1 -mt-px inline h-4 w-4" />
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
                      <MailIcon className="mr-1 -mt-px inline h-4 w-4" />
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
                      <DocumentTextIcon className="mr-1 -mt-px inline h-4 w-4" />
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
                      <ShieldCheckIcon className="mr-1 -mt-px inline h-4 w-4" />
                      {t("privacy_policy")}
                    </a>
                  </li>
                )}
              </ul>
              <hr className="my-6" />
              <small className="leading-1 block text-gray-500">
                Every app published on the Cal.com App Store is open source and thoroughly tested via peer
                reviews. Nevertheless, Cal.com, Inc. does not endorse or certify these apps unless they are
                published by Cal.com. If you encounter inappropriate content or behaviour please report it.
              </small>
              <a className="mt-2 block text-xs text-red-500" href="mailto:help@cal.com">
                <FlagIcon className="inline h-3 w-3" /> Report App
              </a>
            </div>
          </div>
        </div>
      </Shell>
    </>
  );
}
