import Link from "next/link";
import { useRouter } from "next/router";
import type { IframeHTMLAttributes } from "react";
import React, { useState } from "react";

import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { InstallAppButton, AppDependencyComponent } from "@calcom/app-store/components";
import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import Shell from "@calcom/features/shell/Shell";
import classNames from "@calcom/lib/classNames";
import { APP_NAME, COMPANY_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { App as AppType } from "@calcom/types/App";
import { Button, showToast, SkeletonButton, SkeletonText, HeadSeo, Badge } from "@calcom/ui";
import { BookOpen, Check, ExternalLink, File, Flag, Mail, Plus, Shield } from "@calcom/ui/components/icon";

/* These app slugs all require Google Cal to be installed */

const Component = ({
  name,
  type,
  logo,
  slug,
  variant,
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
  descriptionItems,
  isTemplate,
  dependencies,
}: Parameters<typeof App>[0]) => {
  const { t } = useLocale();
  const hasDescriptionItems = descriptionItems && descriptionItems.length > 0;
  const router = useRouter();

  const mutation = useAddAppMutation(null, {
    onSuccess: (data) => {
      if (data?.setupPending) return;
      showToast(t("app_successfully_installed"), "success");
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
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

  const dependencyData = trpc.viewer.appsRouter.queryForDependencies.useQuery(dependencies, {
    enabled: !!dependencies,
  });

  const disableInstall =
    dependencyData.data && dependencyData.data.some((dependency) => !dependency.installed);

  // const disableInstall = requiresGCal && !gCalInstalled.data;

  // variant not other allows, an app to be shown in calendar category without requiring an actual calendar connection e.g. vimcal
  // Such apps, can only be installed once.
  const allowedMultipleInstalls = categories.indexOf("calendar") > -1 && variant !== "other";

  return (
    <div className="relative flex-1 flex-col items-start justify-start px-4 md:flex md:px-8 lg:flex-row lg:px-0">
      {hasDescriptionItems && (
        <div className="align-center bg-subtle mb-4 -ml-4 -mr-4 flex min-h-[450px] w-auto basis-3/5 snap-x snap-mandatory flex-row overflow-auto whitespace-nowrap p-4  md:mb-8 md:-ml-8 md:-mr-8 md:p-8 lg:mx-0 lg:mb-0 lg:max-w-2xl lg:flex-col lg:justify-center lg:rounded-md">
          {descriptionItems ? (
            descriptionItems.map((descriptionItem, index) =>
              typeof descriptionItem === "object" ? (
                <div
                  key={`iframe-${index}`}
                  className="mr-4 max-h-full min-h-[315px] min-w-[90%] max-w-full snap-center last:mb-0 lg:mb-4 lg:mr-0 [&_iframe]:h-full [&_iframe]:min-h-[315px] [&_iframe]:w-full">
                  <iframe allowFullScreen {...descriptionItem.iframe} />
                </div>
              ) : (
                <img
                  key={descriptionItem}
                  src={descriptionItem}
                  alt={`Screenshot of app ${name}`}
                  className="mr-4 h-auto max-h-80 max-w-[90%] snap-center rounded-md object-contain last:mb-0 md:max-h-min lg:mb-4 lg:mr-0  lg:max-w-full"
                />
              )
            )
          ) : (
            <SkeletonText />
          )}
        </div>
      )}
      <div
        className={classNames(
          "sticky top-0 -mt-4 max-w-xl basis-2/5 pb-12 text-sm lg:pb-0",
          hasDescriptionItems && "lg:ml-8"
        )}>
        <div className="mb-8 flex pt-4">
          <header>
            <div className="mb-4 flex items-center">
              <img
                className={classNames(logo.includes("-dark") && "dark:invert", "min-h-16 min-w-16 h-16 w-16")}
                src={logo}
                alt={name}
              />
              <h1 className="font-cal text-emphasis ml-4 text-3xl">{name}</h1>
            </div>
            <h2 className="text-default text-sm font-medium">
              <Link
                href={`categories/${categories[0]}`}
                className="bg-subtle text-emphasis rounded-md p-1 text-xs capitalize">
                {categories[0]}
              </Link>{" "}
              • {t("published_by", { author })}
            </h2>
            {isTemplate && (
              <Badge variant="red" className="mt-4">
                Template - Available in Dev Environment only for testing
              </Badge>
            )}
          </header>
        </div>
        {!appCredentials.isLoading ? (
          isGlobal ||
          (existingCredentials.length > 0 && allowedMultipleInstalls ? (
            <div className="flex space-x-3">
              <Button StartIcon={Check} color="secondary" disabled>
                {existingCredentials.length > 0
                  ? t("active_install", { count: existingCredentials.length })
                  : t("default")}
              </Button>
              {!isGlobal && (
                <InstallAppButton
                  type={type}
                  isProOnly={isProOnly}
                  disableInstall={disableInstall}
                  render={({ useDefaultComponent, ...props }) => {
                    if (useDefaultComponent) {
                      props = {
                        ...props,
                        onClick: () => {
                          mutation.mutate({ type, variant, slug });
                        },
                        loading: mutation.isLoading,
                      };
                    }
                    return (
                      <Button
                        StartIcon={Plus}
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
          ) : existingCredentials.length > 0 ? (
            <DisconnectIntegration
              buttonProps={{ color: "secondary" }}
              label={t("disconnect")}
              credentialId={existingCredentials[0]}
              onSuccess={() => {
                router.replace("/apps/installed");
              }}
            />
          ) : (
            <InstallAppButton
              type={type}
              isProOnly={isProOnly}
              disableInstall={disableInstall}
              render={({ useDefaultComponent, ...props }) => {
                if (useDefaultComponent) {
                  props = {
                    ...props,
                    onClick: () => {
                      mutation.mutate({ type, variant, slug });
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
          ))
        ) : (
          <SkeletonButton className="h-10 w-24" />
        )}

        {dependencies &&
          (!dependencyData.isLoading ? (
            <div className="mt-6">
              <AppDependencyComponent appName={name} dependencyData={dependencyData.data} />
            </div>
          ) : (
            <SkeletonButton className="mt-6 h-20 grow" />
          ))}

        {price !== 0 && (
          <span className="block text-right">
            {feeType === "usage-based" ? commission + "% + " + priceInDollar + "/booking" : priceInDollar}
            {feeType === "monthly" && "/" + t("month")}
          </span>
        )}

        <div className="prose-sm prose prose-a:text-default prose-headings:text-emphasis prose-code:text-default prose-strong:text-default text-default mt-8">
          {body}
        </div>
        <h4 className="text-emphasis mt-8 font-semibold ">{t("pricing")}</h4>
        <span className="text-default">
          {price === 0 ? (
            t("free_to_use_apps")
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

        <h4 className="text-emphasis mt-8 mb-2 font-semibold ">{t("learn_more")}</h4>
        <ul className="prose-sm -ml-1 -mr-1 leading-5">
          {docs && (
            <li>
              <a
                target="_blank"
                rel="noreferrer"
                className="text-emphasis text-sm font-normal no-underline hover:underline"
                href={docs}>
                <BookOpen className="text-subtle mr-1 -mt-1 inline h-4 w-4" />
                {t("documentation")}
              </a>
            </li>
          )}
          {website && (
            <li>
              <a
                target="_blank"
                rel="noreferrer"
                className="text-emphasis font-normal no-underline hover:underline"
                href={website}>
                <ExternalLink className="text-subtle mr-1 -mt-px inline h-4 w-4" />
                {website.replace("https://", "")}
              </a>
            </li>
          )}
          {email && (
            <li>
              <a
                target="_blank"
                rel="noreferrer"
                className="text-emphasis font-normal no-underline hover:underline"
                href={"mailto:" + email}>
                <Mail className="text-subtle mr-1 -mt-px inline h-4 w-4" />

                {email}
              </a>
            </li>
          )}
          {tos && (
            <li>
              <a
                target="_blank"
                rel="noreferrer"
                className="text-emphasis font-normal no-underline hover:underline"
                href={tos}>
                <File className="text-subtle mr-1 -mt-px inline h-4 w-4" />
                {t("terms_of_service")}
              </a>
            </li>
          )}
          {privacy && (
            <li>
              <a
                target="_blank"
                rel="noreferrer"
                className="text-emphasis font-normal no-underline hover:underline"
                href={privacy}>
                <Shield className="text-subtle mr-1 -mt-px inline h-4 w-4" />
                {t("privacy_policy")}
              </a>
            </li>
          )}
        </ul>
        <hr className="border-subtle my-8 border" />
        <span className="leading-1 text-subtle block text-xs">
          {t("every_app_published", { appName: APP_NAME, companyName: COMPANY_NAME })}
        </span>
        <a className="mt-2 block text-xs text-red-500" href={`mailto:${SUPPORT_MAIL_ADDRESS}`}>
          <Flag className="inline h-3 w-3" /> {t("report_app")}
        </a>
      </div>
    </div>
  );
};

const ShellHeading = () => {
  const { t } = useLocale();
  return <span className="block py-2">{t("app_store")}</span>;
};

export default function App(props: {
  name: string;
  description: AppType["description"];
  type: AppType["type"];
  isGlobal?: AppType["isGlobal"];
  logo: string;
  slug: string;
  variant: string;
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
  descriptionItems?: Array<string | { iframe: IframeHTMLAttributes<HTMLIFrameElement> }>;
  isTemplate?: boolean;
  disableInstall?: boolean;
  dependencies?: string[];
}) {
  return (
    <Shell smallHeading isPublic heading={<ShellHeading />} backPath="/apps" withoutSeo>
      <HeadSeo
        title={props.name}
        description={props.description}
        app={{ slug: props.logo, name: props.name, description: props.description }}
      />
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
