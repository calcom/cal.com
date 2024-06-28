import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { InstallAppButton } from "@calcom/app-store/components";
import { doesAppSupportTeamInstall, isConferencing } from "@calcom/app-store/utils";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { UserAdminTeams } from "@calcom/lib/server/repository/user";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";
import type { ButtonProps } from "@calcom/ui";
import { Badge, showToast } from "@calcom/ui";

import { Button } from "../button";

interface AppCardProps {
  app: App;
  credentials?: Credential[];
  searchText?: string;
  userAdminTeams?: UserAdminTeams;
}

export function AppCard({ app, credentials, searchText, userAdminTeams }: AppCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const allowedMultipleInstalls = app.categories && app.categories.indexOf("calendar") > -1;
  const appAdded = (credentials && credentials.length) || 0;
  const enabledOnTeams = doesAppSupportTeamInstall({
    appCategories: app.categories,
    concurrentMeetings: app.concurrentMeetings,
    isPaid: !!app.paid,
  });

  const appInstalled = enabledOnTeams && userAdminTeams ? userAdminTeams.length < appAdded : appAdded > 0;

  const mutation = useAddAppMutation(null, {
    onSuccess: (data) => {
      if (data?.setupPending) return;
      setIsLoading(false);
      showToast(t("app_successfully_installed"), "success");
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
      setIsLoading(false);
    },
  });

  const [searchTextIndex, setSearchTextIndex] = useState<number | undefined>(undefined);
  /**
   * @todo Refactor to eliminate the isLoading state by using mutation.isPending directly.
   * Currently, the isLoading state is used to manage the loading indicator due to the delay in loading the next page,
   * which is caused by heavy queries in getServersideProps. This causes the loader to turn off before the page changes.
   */
  const [isLoading, setIsLoading] = useState<boolean>(mutation.isPending);

  useEffect(() => {
    setSearchTextIndex(searchText ? app.name.toLowerCase().indexOf(searchText.toLowerCase()) : undefined);
  }, [app.name, searchText]);

  const handleAppInstall = () => {
    setIsLoading(true);
    if (isConferencing(app.categories)) {
      mutation.mutate({
        type: app.type,
        variant: app.variant,
        slug: app.slug,
        returnTo:
          WEBAPP_URL +
          getAppOnboardingUrl({
            slug: app.slug,
            step: AppOnboardingSteps.EVENT_TYPES_STEP,
          }),
      });
    } else if (
      !doesAppSupportTeamInstall({
        appCategories: app.categories,
        concurrentMeetings: app.concurrentMeetings,
        isPaid: !!app.paid,
      })
    ) {
      mutation.mutate({ type: app.type });
    } else {
      router.push(getAppOnboardingUrl({ slug: app.slug, step: AppOnboardingSteps.ACCOUNTS_STEP }));
    }
  };

  return (
    <div className="border-subtle relative flex h-64 flex-col rounded-md border p-5">
      <div className="flex">
        <img
          src={app.logo}
          alt={`${app.name} Logo`}
          className={classNames(
            app.logo.includes("-dark") && "dark:invert",
            "mb-4 h-12 w-12 rounded-sm" // TODO: Maybe find a better way to handle this @Hariom?
          )}
        />
      </div>
      <div className="flex items-center">
        <h3 className="text-emphasis font-medium">
          {searchTextIndex != undefined && searchText ? (
            <>
              {app.name.substring(0, searchTextIndex)}
              <span className="bg-yellow-300" data-testid="highlighted-text">
                {app.name.substring(searchTextIndex, searchTextIndex + searchText.length)}
              </span>
              {app.name.substring(searchTextIndex + searchText.length)}
            </>
          ) : (
            app.name
          )}
        </h3>
      </div>
      {/* TODO: add reviews <div className="flex text-sm text-default">
            <span>{props.rating} stars</span> <Icon name="star" className="ml-1 mt-0.5 h-4 w-4 text-yellow-600" />
            <span className="pl-1 text-subtle">{props.reviews} reviews</span>
          </div> */}
      <p
        className="text-default mt-2 flex-grow text-sm"
        style={{
          overflow: "hidden",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: "3",
        }}>
        {app.description}
      </p>

      <div className="mt-5 flex max-w-full flex-row justify-between gap-2">
        <Button
          color="secondary"
          className="flex w-32 flex-grow justify-center"
          href={`/apps/${app.slug}`}
          data-testid={`app-store-app-card-${app.slug}`}>
          {t("details")}
        </Button>
        {app.isGlobal || (credentials && credentials.length > 0 && allowedMultipleInstalls)
          ? !app.isGlobal && (
              <InstallAppButton
                type={app.type}
                teamsPlanRequired={app.teamsPlanRequired}
                disableInstall={!!app.dependencies && !app.dependencyData?.some((data) => !data.installed)}
                wrapperClassName="[@media(max-width:260px)]:w-full"
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
                  return <InstallAppButtonChild paid={app.paid} {...props} />;
                }}
              />
            )
          : credentials &&
            !appInstalled && (
              <InstallAppButton
                type={app.type}
                wrapperClassName="[@media(max-width:260px)]:w-full"
                disableInstall={!!app.dependencies && app.dependencyData?.some((data) => !data.installed)}
                teamsPlanRequired={app.teamsPlanRequired}
                render={({ useDefaultComponent, ...props }) => {
                  if (useDefaultComponent) {
                    props = {
                      ...props,
                      disabled: !!props.disabled,
                      onClick: () => {
                        handleAppInstall();
                      },
                      loading: isLoading,
                    };
                  }
                  return <InstallAppButtonChild paid={app.paid} {...props} />;
                }}
              />
            )}
      </div>
      <div className="max-w-44 absolute right-0 mr-4 flex flex-wrap justify-end gap-1">
        {appAdded > 0 ? <Badge variant="green">{t("installed", { count: appAdded })}</Badge> : null}
        {app.isTemplate && (
          <span className="bg-error rounded-md px-2 py-1 text-sm font-normal text-red-800">Template</span>
        )}
        {(app.isDefault || (!app.isDefault && app.isGlobal)) && (
          <span className="bg-subtle text-emphasis flex items-center rounded-md px-2 py-1 text-sm font-normal">
            {t("default")}
          </span>
        )}
      </div>
    </div>
  );
}

const InstallAppButtonChild = ({
  paid,
  ...props
}: {
  paid: App["paid"];
} & ButtonProps) => {
  const { t } = useLocale();
  // Paid apps don't support team installs at the moment
  // Also, cal.ai(the only paid app at the moment) doesn't support team install either
  if (paid) {
    return (
      <Button
        color="secondary"
        className="[@media(max-width:260px)]:w-full [@media(max-width:260px)]:justify-center"
        StartIcon="plus"
        data-testid="install-app-button"
        {...props}>
        {paid.trial ? t("start_paid_trial") : t("subscribe")}
      </Button>
    );
  }

  return (
    <Button
      color="secondary"
      className="[@media(max-width:260px)]:w-full [@media(max-width:260px)]:justify-center"
      StartIcon="plus"
      data-testid="install-app-button"
      {...props}
      size="base">
      {t("install")}
    </Button>
  );
};
