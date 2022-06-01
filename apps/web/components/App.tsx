import {
  BookOpenIcon,
  DocumentTextIcon,
  ExternalLinkIcon,
  FlagIcon,
  MailIcon,
  ShieldCheckIcon,
  PlusIcon,
  CheckIcon,
} from "@heroicons/react/outline";
import { ChevronLeftIcon } from "@heroicons/react/solid";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { App as AppType } from "@calcom/types/App";
import { Button, SkeletonButton } from "@calcom/ui";

import Shell from "@components/Shell";
import Badge from "@components/ui/Badge";

export default function App({
  name,
  type,
  logo,
  body,
  categories,
  author,
  price = 0,
  commission,
  isGlobal = false,
  feeType,
  docs,
  website,
  email,
  tos,
  privacy,
}: {
  name: string;
  type: AppType["type"];
  isGlobal?: AppType["isGlobal"];
  logo: string;
  body: React.ReactNode;
  categories: string[];
  author: string;
  pro?: boolean;
  price?: number;
  commission?: number;
  feeType?: AppType["feeType"];
  docs?: string;
  website?: string;
  email: string; // required
  tos?: string;
  privacy?: string;
}) {
  const { t } = useLocale();

  const priceInDollar = Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    useGrouping: false,
  }).format(price);
  const [installedApp, setInstalledApp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    async function getInstalledApp(appCredentialType: string) {
      const queryParam = new URLSearchParams();
      queryParam.set("app-credential-type", appCredentialType);
      try {
        const result = await fetch(`/api/app-store/installed?${queryParam.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }).then((data) => {
          setIsLoading(false);
          return data;
        });
        if (result.status === 200) {
          const res = await result.json();
          setInstalledApp(res.count);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.log(error.message);
        }
      }
    }
    getInstalledApp(type);
  }, [type]);
  return (
    <>
      <Shell large isPublic>
        <div className="-mx-4 md:-mx-8">
          <div className="bg-gray-50 px-4">
            <Link href="/apps">
              <a className="mt-2 inline-flex px-1 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                <ChevronLeftIcon className="h-5 w-5" /> {t("browse_apps")}
              </a>
            </Link>
            <div className="items-center justify-between py-4 sm:flex sm:py-8">
              <div className="flex">
                {
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-16 w-16" src={logo} alt={name} />
                }
                <header className="px-4 py-2">
                  <h1 className="font-cal text-xl text-gray-900">{name}</h1>
                  <h2 className="text-sm text-gray-500">
                    <span className="capitalize">{categories[0]}</span> • {t("published_by", { author })}
                  </h2>
                </header>
              </div>

              <div className="mt-4 sm:mt-0 sm:text-right">
                {!isLoading ? (
                  isGlobal || installedApp > 0 ? (
                    <div className="space-x-3">
                      <Button StartIcon={CheckIcon} color="secondary" disabled>
                        {installedApp > 0
                          ? t("active_install", { count: installedApp })
                          : t("globally_install")}
                      </Button>
                      <InstallAppButton
                        type={type}
                        render={(buttonProps) => (
                          <Button StartIcon={PlusIcon} data-testid="install-app-button" {...buttonProps}>
                            {t("add_another")}
                          </Button>
                        )}
                      />
                    </div>
                  ) : (
                    <InstallAppButton
                      type={type}
                      render={(buttonProps) => (
                        <Button data-testid="install-app-button" {...buttonProps}>
                          {t("install_app")}
                        </Button>
                      )}
                    />
                  )
                ) : (
                  <SkeletonButton width="24" height="10" />
                )}
                {price !== 0 && (
                  <small className="block text-right">
                    {feeType === "usage-based"
                      ? commission + "% + " + priceInDollar + "/booking"
                      : priceInDollar}
                    {feeType === "monthly" && "/" + t("month")}
                  </small>
                )}
              </div>
            </div>
            {/* reintroduce once we show permissions and features
            <NavTabs tabs={tabs} linkProps={{ shallow: true }} /> */}
          </div>

          <div className="justify-between px-4 py-10 md:flex">
            <div className="prose-sm prose mb-6">{body}</div>
            <div className="md:max-w-80 flex-1 md:ml-8">
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
                    {feeType === "monthly" && "/" + t("month")}
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
