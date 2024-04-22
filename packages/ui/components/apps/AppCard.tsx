import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { InstallAppButton } from "@calcom/app-store/components";
import { doesAppSupportTeamInstall } from "@calcom/app-store/utils";
import type { UserAdminTeams } from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";
import type { ButtonProps } from "@calcom/ui";
import { Badge } from "@calcom/ui";

import { Button } from "../button";

interface AppCardProps {
  app: App;
  credentials?: Credential[];
  searchText?: string;
  userAdminTeams?: UserAdminTeams;
}

export function AppCard({ app, credentials, searchText, userAdminTeams }: AppCardProps) {
  const { t } = useLocale();
  const allowedMultipleInstalls = app.categories && app.categories.indexOf("calendar") > -1;
  const appAdded = (credentials && credentials.length) || 0;
  const enabledOnTeams = doesAppSupportTeamInstall({
    appCategories: app.categories,
    concurrentMeetings: app.concurrentMeetings,
    isPaid: !!app.paid,
  });

  const appInstalled = enabledOnTeams && userAdminTeams ? userAdminTeams.length < appAdded : appAdded > 0;

  const [searchTextIndex, setSearchTextIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    setSearchTextIndex(searchText ? app.name.toLowerCase().indexOf(searchText.toLowerCase()) : undefined);
  }, [app.name, searchText]);

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
                    };
                  }
                  return (
                    <InstallAppButtonChild
                      userAdminTeams={userAdminTeams}
                      {...props}
                      addAppMutationInput={{ type: app.type, variant: app.variant, slug: app.slug }}
                      appCategories={app.categories}
                      concurrentMeetings={app.concurrentMeetings}
                      paid={app.paid}
                      dirName={app.dirName}
                    />
                  );
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
                    };
                  }
                  return (
                    <InstallAppButtonChild
                      userAdminTeams={userAdminTeams}
                      addAppMutationInput={{ type: app.type, variant: app.variant, slug: app.slug }}
                      appCategories={app.categories}
                      concurrentMeetings={app.concurrentMeetings}
                      paid={app.paid}
                      dirName={app.dirName}
                      {...props}
                    />
                  );
                }}
              />
            )}
      </div>
      <div className="max-w-44 absolute right-0 mr-4 flex flex-wrap justify-end gap-1">
        {appInstalled ? <Badge variant="green">{t("installed", { count: appAdded })}</Badge> : null}
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
  userAdminTeams,
  addAppMutationInput,
  appCategories,
  concurrentMeetings,
  paid,
  ...props
}: {
  userAdminTeams?: UserAdminTeams;
  addAppMutationInput: { type: App["type"]; variant: string; slug: string };
  appCategories: string[];
  concurrentMeetings?: boolean;
  dirName: string | undefined;
  paid: App["paid"];
} & ButtonProps) => {
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  if (
    !userAdminTeams?.length ||
    !doesAppSupportTeamInstall({ appCategories, concurrentMeetings, isPaid: !!paid })
  ) {
    return (
      <Button
        color="secondary"
        className="[@media(max-width:260px)]:w-full [@media(max-width:260px)]:justify-center"
        StartIcon="plus"
        data-testid="install-app-button"
        {...props}>
        {t("install")}
      </Button>
    );
  }

  return (
    <Button
      color="secondary"
      className="[@media(max-width:260px)]:w-full [@media(max-width:260px)]:justify-center"
      StartIcon="plus"
      data-testid="install-app-button"
      loading={loading}
      {...props}
      onClick={() => {
        setLoading(true);
        router.push(
          getAppOnboardingUrl({ slug: addAppMutationInput.slug, step: AppOnboardingSteps.ACCOUNTS_STEP })
        );
      }}
      size="base">
      {t("install")}
    </Button>
  );
};
