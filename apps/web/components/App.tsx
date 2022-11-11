import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";

import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { InstallAppButton } from "@calcom/app-store/components";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { App as AppType } from "@calcom/types/App";
import { Button, SkeletonButton } from "@calcom/ui";
import { Icon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";
import { Badge } from "@calcom/ui/components/badge";
import showToast from "@calcom/ui/v2/core/notifications";

import DisconnectIntegration from "@components/integrations/DisconnectIntegration";

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
}: Parameters<typeof App>[0]) => {
  const { t } = useLocale();
  const router = useRouter();
  const { data: user } = trpc.viewer.me.useQuery();

  const utils = trpc.useContext();
  const handleOpenChange = () => {
    utils.viewer.integrations.invalidate();
    router.replace("/apps/installed");
  };

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

  const [existingCredentials, setExistingCredentials] = useState<number[]>([]);
  const appCredentials = trpc.viewer.appCredentialsByType.useQuery(
    { appType: type },
    {
      onSuccess(data) {
        setExistingCredentials(data);
      },
    }
  );

  const allowedMultipleInstalls = categories.indexOf("calendar") > -1;

  return (
    <div className="-mx-4 md:-mx-8">
      <div className="px-8">
        <Link href="/apps">
          <a className="mt-2 inline-flex px-1 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <Icon.FiChevronLeft className="h-5 w-5" /> {t("browse_apps")}
          </a>
        </Link>
        <div className="items-center justify-between py-4 sm:flex sm:py-8">
          <div className="flex">
            <img className="h-16 w-16 rounded-sm" src={logo} alt={name} />
            <header className="px-4 py-2">
              <div className="flex items-center">
                <h1 className="font-cal text-xl text-gray-900">{name}</h1>
              </div>
              <h2 className="text-sm text-gray-500">
                <span className="capitalize">{categories[0]}</span> • {t("published_by", { author })}
              </h2>
            </header>
          </div>

          <div className="mt-4 sm:mt-0 sm:text-right">
            {!appCredentials.isLoading ? (
              isGlobal ||
              (existingCredentials.length > 0 && allowedMultipleInstalls ? (
                <div className="flex space-x-3">
                  <Button StartIcon={Icon.FiCheck} color="secondary" disabled>
                    {existingCredentials.length > 0
                      ? t("active_install", { count: existingCredentials.length })
                      : t("globally_install")}
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
                          <Button StartIcon={Icon.FiPlus} {...props} data-testid="install-app-button">
                            {t("add_another")}
                          </Button>
                        );
                      }}
                    />
                  )}
                </div>
              ) : existingCredentials.length > 0 ? (
                <DisconnectIntegration
                  id={existingCredentials[0]}
                  render={(btnProps) => (
                    <Button {...btnProps} color="warn" data-testid={type + "-integration-disconnect-button"}>
                      {t("disconnect")}
                    </Button>
                  )}
                  onOpenChange={handleOpenChange}
                />
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
                      <Button data-testid="install-app-button" {...props}>
                        {t("install_app")}
                      </Button>
                    );
                  }}
                />
              ))
            ) : (
              <SkeletonButton width="24" height="10" />
            )}
            {price !== 0 && (
              <small className="block text-right">
                {feeType === "usage-based" ? commission + "% + " + priceInDollar + "/booking" : priceInDollar}
                {feeType === "monthly" && "/" + t("month")}
              </small>
            )}
          </div>
        </div>
      </div>

      <div className="justify-between px-8 py-10 md:flex">
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
                  <Icon.FiBookOpen className="mr-1 -mt-1 inline h-4 w-4" />
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
                  <Icon.FiExternalLink className="mr-1 -mt-px inline h-4 w-4" />
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
                  <Icon.FiMail className="mr-1 -mt-px inline h-4 w-4" />

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
                  <Icon.FiFile className="mr-1 -mt-px inline h-4 w-4" />
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
                  <Icon.FiShield className="mr-1 -mt-px inline h-4 w-4" />
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
            <Icon.FiFlag className="inline h-3 w-3" /> Report App
          </a>
        </div>
      </div>
    </div>
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
