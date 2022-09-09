import Link from "next/link";
import React, { useEffect, useState } from "react";

import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { InstallAppButton } from "@calcom/app-store/components";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { App as AppType } from "@calcom/types/App";
import Badge from "@calcom/ui/Badge";
import { Icon } from "@calcom/ui/Icon";
import { Button, SkeletonButton, Shell } from "@calcom/ui/v2";

const Component = ({
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
  isProOnly,
  images,
}: Parameters<typeof App>[0]) => {
  const { t } = useLocale();
  const { data: user } = trpc.useQuery(["viewer.me"]);
  const hasImages = images && images.length > 0;

  const mutation = useAddAppMutation(null, {
    onSuccess: () => {
      showToast("App successfully installed", "success");
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || "App could not be installed", "error");
    },
  });

  const priceInDollar = Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    useGrouping: false,
  }).format(price);
  const [installedAppCount, setInstalledAppCount] = useState(0);
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
          setInstalledAppCount(res.count);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.log(error.message);
        }
      }
    }
    getInstalledApp(type);
  }, [type]);
  const allowedMultipleInstalls = categories.indexOf("calendar") > -1;

  return (
    <>
      <div className="px-4 pb-3 pt-3 md:px-8 lg:px-0 lg:pt-0">
        <Link href="/apps">
          <a className="text-md hover:text-brand-400 inline-flex rounded-sm py-2 font-semibold  text-gray-900">
            <Icon.FiArrowLeft className="mr-2 h-6 w-6" /> {t("app_store")}
          </a>
        </Link>
      </div>

      <div className="relative flex-1 flex-col items-start justify-start px-4 md:flex md:px-8 lg:flex-row lg:px-0">
        {hasImages && (
          <div className="flex-2 mb-4 -ml-4 -mr-4 flex w-auto snap-x snap-mandatory flex-row overflow-auto whitespace-nowrap bg-gray-100  p-4 md:mb-8 md:-ml-8 md:-mr-8 md:p-8 lg:mx-0 lg:mb-0 lg:max-w-2xl lg:flex-col lg:rounded-md">
            {images &&
              images.map((img) => (
                <img
                  key={img}
                  src={img}
                  alt={`Screenshot of app ${name}`}
                  className="mr-4 h-auto max-h-80 max-w-[90%] snap-center rounded-md object-contain last:mb-0 md:max-h-min lg:mb-4 lg:mr-0  lg:max-w-full"
                />
              ))}
          </div>
        )}
        <div
          className={classNames(
            "sticky top-0 -mt-4 max-w-xl flex-1 pb-12 text-sm lg:pb-0",
            hasImages && "lg:ml-8"
          )}>
          <div className="mb-8 flex pt-4">
            <header>
              <div className="mb-4 flex items-center">
                <img className="min-h-16 min-w-16 h-16 w-16" src={logo} alt={name} />
                <h1 className="font-cal ml-4 text-3xl text-gray-900">{name}</h1>
                {isProOnly && user?.plan === "FREE" ? (
                  <Badge className="ml-2" variant="default">
                    PRO
                  </Badge>
                ) : null}
              </div>
              <h2 className="text-sm font-medium text-gray-600">
                <Link href={`categories/${categories[0]}`}>
                  <a className="rounded-md bg-gray-100 p-1 text-xs capitalize text-gray-800">
                    {categories[0]}
                  </a>
                </Link>{" "}
                • {t("published_by", { author })}
              </h2>
            </header>
          </div>
          {!isLoading ? (
            isGlobal || (installedAppCount > 0 && allowedMultipleInstalls) ? (
              <div className="flex space-x-3">
                <Button StartIcon={Icon.FiCheck} color="secondary" disabled>
                  {installedAppCount > 0 ? t("active_install", { count: installedAppCount }) : t("default")}
                </Button>
                {!isGlobal && (
                  <InstallAppButton
                    type={type}
                    isProOnly={isProOnly}
                    render={({ useDefaultComponent, ...props }) => {
                      if (useDefaultComponent) {
                        props = {
                          onClick: () => {
                            mutation.mutate({ type });
                          },
                          loading: mutation.isLoading,
                        };
                      }
                      return (
                        <Button
                          StartIcon={Icon.FiPlus}
                          {...props}
                          // @TODO: Overriding color and size prevent us from
                          // having to duplicate InstallAppButton for now.
                          color="primary"
                          size="base"
                          data-testid="install-app-button">
                          {t("install_another")}
                        </Button>
                      );
                    }}
                  />
                )}
              </div>
            ) : installedAppCount > 0 ? (
              <Button color="secondary" disabled title="App already installed">
                {t("installed")}
              </Button>
            ) : (
              <InstallAppButton
                type={type}
                isProOnly={isProOnly}
                render={({ useDefaultComponent, ...props }) => {
                  if (useDefaultComponent) {
                    props = {
                      onClick: () => {
                        mutation.mutate({ type });
                      },
                      loading: mutation.isLoading,
                    };
                  }
                  return (
                    <Button
                      data-testid="install-app-button"
                      {...props}
                      // @TODO: Overriding color and size prevent us from
                      // having to duplicate InstallAppButton for now.
                      color="primary"
                      size="base">
                      {t("install_app")}
                    </Button>
                  );
                }}
              />
            )
          ) : (
            <SkeletonButton className="h-10 w-24" />
          )}
          {price !== 0 && (
            <span className="block text-right">
              {feeType === "usage-based" ? commission + "% + " + priceInDollar + "/booking" : priceInDollar}
              {feeType === "monthly" && "/" + t("month")}
            </span>
          )}

          <div className="prose prose-sm mt-8 space-x-2">{body}</div>
          <h4 className="mt-8 font-semibold text-gray-900 ">{t("pricing")}</h4>
          <span>
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
          </span>

          <h4 className="mt-8 mb-2 font-semibold text-gray-900 ">{t("learn_more")}</h4>
          <ul className="prose-sm -ml-1 -mr-1 leading-5">
            {docs && (
              <li>
                <a
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-normal text-black no-underline hover:underline"
                  href={docs}>
                  <Icon.FiBookOpen className="mr-1 -mt-1 inline h-4 w-4 text-gray-500" />
                  {t("documentation")}
                </a>
              </li>
            )}
            {website && (
              <li>
                <a
                  target="_blank"
                  rel="noreferrer"
                  className="font-normal text-black no-underline hover:underline"
                  href={website}>
                  <Icon.FiExternalLink className="mr-1 -mt-px inline h-4 w-4 text-gray-500" />
                  {website.replace("https://", "")}
                </a>
              </li>
            )}
            {email && (
              <li>
                <a
                  target="_blank"
                  rel="noreferrer"
                  className="font-normal text-black no-underline hover:underline"
                  href={"mailto:" + email}>
                  <Icon.FiMail className="mr-1 -mt-px inline h-4 w-4 text-gray-500" />

                  {email}
                </a>
              </li>
            )}
            {tos && (
              <li>
                <a
                  target="_blank"
                  rel="noreferrer"
                  className="font-normal text-black no-underline hover:underline"
                  href={tos}>
                  <Icon.FiFile className="mr-1 -mt-px inline h-4 w-4 text-gray-500" />
                  {t("terms_of_service")}
                </a>
              </li>
            )}
            {privacy && (
              <li>
                <a
                  target="_blank"
                  rel="noreferrer"
                  className="font-normal text-black no-underline hover:underline"
                  href={privacy}>
                  <Icon.FiShield className="mr-1 -mt-px inline h-4 w-4 text-gray-500" />
                  {t("privacy_policy")}
                </a>
              </li>
            )}
          </ul>
          <hr className="my-8" />
          <span className="leading-1 block text-xs text-gray-500">
            Every app published on the Cal.com App Store is open source and thoroughly tested via peer
            reviews. Nevertheless, Cal.com, Inc. does not endorse or certify these apps unless they are
            published by Cal.com. If you encounter inappropriate content or behaviour please report it.
          </span>
          <a className="mt-2 block text-xs text-red-500" href="mailto:help@cal.com">
            <Icon.FiFlag className="inline h-3 w-3" /> Report App
          </a>
        </div>
      </div>
    </>
  );
};

export default function App(props: {
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
  licenseRequired: AppType["licenseRequired"];
  isProOnly: AppType["isProOnly"];
  images?: string[];
}) {
  return (
    <Shell large isPublic>
      {props.licenseRequired ? (
        <LicenseRequired>
          <Component {...props} />
        </LicenseRequired>
      ) : (
        <Component {...props} />
      )}
    </Shell>
  );
}
