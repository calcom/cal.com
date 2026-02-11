import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IframeHTMLAttributes } from "react";
import React, { useEffect, useState } from "react";

import { AppDependencyComponent } from "@calcom/app-store/AppDependencyComponent";
import { InstallAppButton } from "@calcom/app-store/InstallAppButton";
import { isRedirectApp } from "@calcom/app-store/_utils/redirectApps";
import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { doesAppSupportTeamInstall, isConferencing } from "@calcom/app-store/utils";
import DisconnectIntegration from "@calcom/web/modules/apps/components/DisconnectIntegration";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import { APP_NAME, COMPANY_NAME, SUPPORT_MAIL_ADDRESS, WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import type { App as AppType } from "@calcom/types/App";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonButton, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

import { InstallAppButtonChild } from "./InstallAppButtonChild";
import { MultiDisconnectIntegration } from "./MultiDisconnectIntegration";

export type AppPageProps = {
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
  teamsPlanRequired: AppType["teamsPlanRequired"];
  descriptionItems?: Array<string | { iframe: IframeHTMLAttributes<HTMLIFrameElement> }>;
  isTemplate?: boolean;
  disableInstall?: boolean;
  dependencies?: string[];
  concurrentMeetings: AppType["concurrentMeetings"];
  paid?: AppType["paid"];
};

export const AppPage = ({
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
  teamsPlanRequired,
  descriptionItems,
  isTemplate,
  dependencies,
  concurrentMeetings,
  paid,
}: AppPageProps) => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const searchParams = useCompatSearchParams();

  const hasDescriptionItems = descriptionItems && descriptionItems.length > 0;
  const utils = trpc.useUtils();

  const mutation = useAddAppMutation(null, {
    onSuccess: async (data) => {
      if (data?.setupPending) return;
      setIsLoading(false);
      showToast(data?.message || t("app_successfully_installed"), "success");
      await utils.viewer.apps.appCredentialsByType.invalidate({ appType: type });
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
      setIsLoading(false);
    },
  });

  /**
   * @todo Refactor to eliminate the isLoading state by using mutation.isPending directly.
   * Currently, the isLoading state is used to manage the loading indicator due to the delay in loading the next page,
   * which is caused by heavy queries in getServersideProps. This causes the loader to turn off before the page changes.
   */
  const [isLoading, setIsLoading] = useState<boolean>(mutation.isPending);
  const availableForTeams = doesAppSupportTeamInstall({
    appCategories: categories,
    concurrentMeetings: concurrentMeetings,
    isPaid: !!paid,
  });

  const handleAppInstall = () => {
    if (isRedirectApp(slug)) {
      // For redirect apps, open the external URL directly
      if (website) window.open(website, "_blank", "noopener,noreferrer");
      return;
    }
    setIsLoading(true);
    if (isConferencing(categories) && !concurrentMeetings) {
      mutation.mutate({
        type,
        variant,
        slug,
        returnTo:
          WEBAPP_URL +
          getAppOnboardingUrl({
            slug,
            step: AppOnboardingSteps.EVENT_TYPES_STEP,
          }),
      });
    } else if (!availableForTeams) {
      mutation.mutate({ type });
    } else {
      router.push(getAppOnboardingUrl({ slug, step: AppOnboardingSteps.ACCOUNTS_STEP }));
    }
  };

  const priceInDollar = Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    useGrouping: false,
  }).format(price);

  type Credentials = RouterOutputs["viewer"]["apps"]["appCredentialsByType"]["credentials"];

  const [existingCredentials, setExistingCredentials] = useState<Credentials>([]);

  /**
   * Marks whether the app is installed for all possible teams and the user.
   */
  const [appInstalledForAllTargets, setAppInstalledForAllTargets] = useState(false);

  const appDbQuery = trpc.viewer.apps.appCredentialsByType.useQuery({ appType: type });

  useEffect(
    function refactorMeWithoutEffect() {
      const data = appDbQuery.data;

      const credentials = data?.credentials || [];
      setExistingCredentials(credentials);

      const hasPersonalInstall = credentials.some((c) => !!c.userId && !c.teamId);
      const installedTeamIds = new Set<number>();
      for (const cred of credentials) {
        if (cred.teamId) installedTeamIds.add(cred.teamId);
      }

      const totalInstalledTargets = (hasPersonalInstall ? 1 : 0) + installedTeamIds.size;

      const appInstalledForAllTargets =
        availableForTeams && data?.userAdminTeams && data.userAdminTeams.length > 0
          ? totalInstalledTargets >= data.userAdminTeams.length + 1
          : credentials.length > 0;
      setAppInstalledForAllTargets(appInstalledForAllTargets);
    },
    [appDbQuery.data, availableForTeams]
  );

  const dependencyData = trpc.viewer.apps.queryForDependencies.useQuery(dependencies, {
    enabled: !!dependencies,
  });

  const disableInstall = dependencyData.data
    ? dependencyData.data.some((dependency) => !dependency.installed)
    : false;

  // const disableInstall = requiresGCal && !gCalInstalled.data;

  // variant not other allows, an app to be shown in calendar category without requiring an actual calendar connection e.g. vimcal
  // Such apps, can only be installed once.

  const allowedMultipleInstalls = categories.indexOf("calendar") > -1 && variant !== "other";
  useEffect(() => {
    if (searchParams?.get("defaultInstall") === "true") {
      mutation.mutate({ type, variant, slug, defaultInstall: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run only once on mount
  }, []);

  const installOrDisconnectAppButton = () => {
    if (isRedirectApp(slug)) {
      return (
        <Button
          onClick={() => handleAppInstall()}
          className="mt-2"
          StartIcon="external-link"
          loading={isLoading}
          disabled={isLoading}>
          {t("visit")}
        </Button>
      );
    }

    if (appDbQuery.isPending) {
      return <SkeletonButton className="h-10 w-24" />;
    }

    const MultiInstallButtonEl = (
      <InstallAppButton
        type={type}
        disableInstall={disableInstall}
        teamsPlanRequired={teamsPlanRequired}
        render={({ useDefaultComponent, ...props }) => {
          if (useDefaultComponent) {
            props = {
              ...props,
              onClick: () => {
                handleAppInstall();
              },
              loading: isLoading,
            };
          }
          return <InstallAppButtonChild multiInstall paid={paid} {...props} />;
        }}
      />
    );

    const SingleInstallButtonEl = (
      <InstallAppButton
        type={type}
        disableInstall={disableInstall}
        teamsPlanRequired={teamsPlanRequired}
        render={({ useDefaultComponent, ...props }) => {
          if (useDefaultComponent) {
            props = {
              ...props,
              onClick: () => {
                handleAppInstall();
              },
              loading: isLoading,
            };
          }

          return (
            <InstallAppButtonChild
              credentials={availableForTeams ? undefined : appDbQuery.data?.credentials}
              paid={paid}
              {...props}
            />
          );
        }}
      />
    );

    return (
      <div className="flex items-center space-x-3">
        {isGlobal ||
          (existingCredentials.length > 0 && allowedMultipleInstalls ? (
            <div className="flex space-x-3">
              <Button StartIcon="check" color="secondary" disabled>
                {existingCredentials.length > 0
                  ? t("active_install", { count: existingCredentials.length })
                  : t("default")}
              </Button>
              {!isGlobal && !appInstalledForAllTargets && MultiInstallButtonEl}
            </div>
          ) : (
            !appInstalledForAllTargets && SingleInstallButtonEl
          ))}

        {existingCredentials.length > 0 && (
          <>
            {existingCredentials.length > 1 ? (
              <MultiDisconnectIntegration
                credentials={existingCredentials}
                onSuccess={() => appDbQuery.refetch()}
              />
            ) : (
              <DisconnectIntegration
                buttonProps={{ color: "secondary" }}
                label={t("disconnect")}
                credentialId={Number(existingCredentials[0].id)}
                teamId={existingCredentials[0].teamId}
                onSuccess={() => appDbQuery.refetch()}
              />
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative mt-4 flex-1 flex-col items-start justify-start px-4 md:mt-0 md:flex md:px-8 lg:flex-row lg:px-0">
      {hasDescriptionItems && (
        <div className="align-center bg-subtle -ml-4 -mr-4 mb-4 flex min-h-[450px] w-auto basis-3/5 snap-x snap-mandatory flex-row overflow-auto whitespace-nowrap p-4  md:-ml-8 md:-mr-8 md:mb-8 md:p-8 lg:mx-0 lg:mb-0 lg:max-w-2xl lg:flex-col lg:justify-center lg:rounded-md">
          {descriptionItems ? (
            descriptionItems.map((descriptionItem, index) =>
              typeof descriptionItem === "object" ? (
                <div
                  key={`iframe-${index}`}
                  className="mr-4 max-h-full min-h-[315px] min-w-[90%] max-w-full snap-center overflow-hidden rounded-md last:mb-0 lg:mb-4 lg:mr-0 [&_iframe]:h-full [&_iframe]:min-h-[315px] [&_iframe]:w-full">
                  <iframe allowFullScreen {...descriptionItem.iframe} />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- external app screenshots with unknown dimensions
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
              {/* eslint-disable-next-line @next/next/no-img-element -- external app logo with unknown dimensions */}
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
              {paid && (
                <>
                  <Badge className="mr-1">
                    {Intl.NumberFormat(i18n.language, {
                      style: "currency",
                      currency: "USD",
                      useGrouping: false,
                      maximumFractionDigits: 0,
                    }).format(paid.priceInUsd)}
                    /{t("month")}
                  </Badge>
                </>
              )}
              •{" "}
              <a target="_blank" rel="noreferrer" href={website}>
                {t("published_by", { author })}
              </a>
            </h2>
            {isTemplate && (
              <Badge variant="red" className="mt-4">
                Template - Available in Dev Environment only for testing
              </Badge>
            )}
          </header>
        </div>
        {installOrDisconnectAppButton()}

        {slug === "msteams" && (
          <div className="bg-info mt-4 rounded-md px-4 py-3">
            <div className="items-start space-x-2.5">
              <div className="text-info flex items-start">
                <div>
                  <Icon name="circle-alert" className="mr-2 mt-1 font-semibold" />
                </div>
                <div>
                  <span className="font-semibold">{t("msteams_calendar_warning_body")}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {dependencies &&
          (!dependencyData.isPending ? (
            <div className="mt-6">
              <AppDependencyComponent appName={name} dependencyData={dependencyData.data} />
            </div>
          ) : (
            <SkeletonButton className="mt-6 h-20 grow" />
          ))}

        {price !== 0 && !paid && (
          <span className="block text-right">
            {feeType === "usage-based" ? `${commission}% + ${priceInDollar}/booking` : priceInDollar}
            {feeType === "monthly" && `/${t("month")}`}
          </span>
        )}

        <div className="prose-sm prose prose-a:text-default prose-headings:text-emphasis prose-code:text-default prose-strong:text-default text-default mt-8">
          {body}
        </div>
        {!paid && (
          <>
            <h4 className="text-emphasis mt-8 font-semibold ">{t("pricing")}</h4>
            <span className="text-default">
              {teamsPlanRequired ? (
                t("teams_plan_required")
              ) : price === 0 ? (
                t("free_to_use_apps")
              ) : (
                <>
                  {Intl.NumberFormat(i18n.language, {
                    style: "currency",
                    currency: "USD",
                    useGrouping: false,
                  }).format(price)}
                  {feeType === "monthly" && `/${t("month")}`}
                </>
              )}
            </span>
          </>
        )}

        <h4 className="text-emphasis mb-2 mt-8 font-semibold ">{t("contact")}</h4>
        <ul className="prose-sm -ml-1 -mr-1 leading-5">
          {docs && (
            <li>
              <a
                target="_blank"
                rel="noreferrer"
                className="text-emphasis text-sm font-normal no-underline hover:underline"
                href={docs}>
                <Icon name="book-open" className="text-subtle -mt-1 mr-1 inline h-4 w-4" />
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
                <Icon name="external-link" className="text-subtle -mt-px mr-1 inline h-4 w-4" />
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
                href={`mailto:${email}`}>
                <Icon name="mail" className="text-subtle -mt-px mr-1 inline h-4 w-4" />

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
                <Icon name="file" className="text-subtle -mt-px mr-1 inline h-4 w-4" />
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
                <Icon name="shield" className="text-subtle -mt-px mr-1 inline h-4 w-4" />
                {t("privacy_policy")}
              </a>
            </li>
          )}
        </ul>
        <hr className="border-subtle my-8 border" />
        <span className="text-subtle block text-xs">
          {t("every_app_published", { appName: APP_NAME, companyName: COMPANY_NAME })}
        </span>
        <a className="mt-2 block text-xs text-red-500" href={`mailto:${SUPPORT_MAIL_ADDRESS}`}>
          <Icon name="flag" className="inline h-3 w-3" /> {t("report_app")}
        </a>
      </div>
    </div>
  );
};
