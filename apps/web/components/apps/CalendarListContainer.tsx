"use client";

import { InstallAppButton } from "@calcom/app-store/InstallAppButton";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Switch } from "@calcom/ui/components/form";
import { ShellSubHeading } from "@calcom/ui/components/layout";
import { List } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateSettingsCalendars } from "@calcom/web/app/cache/path/settings/my-account";
import AppListCard from "@calcom/web/modules/apps/components/AppListCard";
import { SkeletonLoader } from "@calcom/web/modules/apps/components/SkeletonLoader";
import { SelectedCalendarsSettingsWebWrapper } from "@calcom/web/modules/calendars/components/SelectedCalendarsSettingsWebWrapper";
import SubHeadingTitleWithConnections from "@components/integrations/SubHeadingTitleWithConnections";
import useRouterQuery from "@lib/hooks/useRouterQuery";

import { QueryCell } from "@lib/QueryCell";
import { Suspense, useEffect, useState } from "react";
import { DestinationCalendarSettingsWebWrapper } from "./DestinationCalendarSettingsWebWrapper";

type CalendarListContainerProps = {
  connectedCalendars: RouterOutputs["viewer"]["calendars"]["connectedCalendars"];
  installedCalendars: RouterOutputs["viewer"]["apps"]["integrations"];
  heading?: boolean;
  fromOnboarding?: boolean;
};

type Props = {
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
  isPending?: boolean;
};

function CalendarList(props: Props): JSX.Element {
  const { t } = useLocale();
  const query = trpc.viewer.apps.integrations.useQuery({ variant: "calendar", onlyInstalled: false });

  return (
    <QueryCell
      query={query}
      success={({ data }) => (
        <List>
          {data.items.map((item) => (
            <AppListCard
              title={item.name}
              key={item.name}
              logo={item.logo}
              description={item.description}
              shouldHighlight
              slug={item.slug}
              actions={
                <InstallAppButton
                  type={item.type}
                  render={(buttonProps) => (
                    <Button color="secondary" {...buttonProps}>
                      {t("connect")}
                    </Button>
                  )}
                  onChanged={() => props.onChanged()}
                />
              }
            />
          ))}
        </List>
      )}
    />
  );
}

const AddCalendarButton = (): JSX.Element => {
  const { t } = useLocale();
  return (
    <Button color="secondary" StartIcon="plus" href="/apps/categories/calendar">
      {t("add_calendar")}
    </Button>
  );
};

export const CalendarListContainerSkeletonLoader = (): JSX.Element => {
  const { t } = useLocale();
  return (
    <SettingsHeader
      title={t("calendars")}
      description={t("calendars_description")}
      CTA={<AddCalendarButton />}>
      <SkeletonLoader />
    </SettingsHeader>
  );
};

export function CalendarListContainer({
  connectedCalendars: data,
  installedCalendars,
  heading = true,
  fromOnboarding,
}: CalendarListContainerProps): JSX.Element {
  const { t } = useLocale();
  const { error, setQuery: setError } = useRouterQuery("error");
  const [loading, setLoading] = useState(false);
  const [isNotifyCalendarAlertsChecked, setIsNotifyCalendarAlertsChecked] = useState(true);

  const { data: user } = trpc.viewer.me.get.useQuery();

  // Sync local state with user data
  useEffect(() => {
    if (user) {
      // Default to true if notifyCalendarAlerts is null/undefined (matches database default)
      setIsNotifyCalendarAlertsChecked(user.notifyCalendarAlerts ?? true);
    }
  }, [user]);

  const updateProfileMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      showToast(t("settings_updated_successfully"), "success");
      setLoading(false);
      // Don't invalidate immediately to avoid race conditions with optimistic updates
    },
    onError: (error) => {
      showToast(error.message, "error");
      // Revert the optimistic update on error
      setIsNotifyCalendarAlertsChecked(!isNotifyCalendarAlertsChecked);
      setLoading(false);
    },
  });

  const handleCalendarNotificationToggle = async (enabled: boolean) => {
    setLoading(true);
    // Optimistic update
    setIsNotifyCalendarAlertsChecked(enabled);
    updateProfileMutation.mutate({
      notifyCalendarAlerts: enabled,
    });
  };

  useEffect(() => {
    if (error === "account_already_linked" || error === "no_default_calendar") {
      showToast(t(error), "error", { id: error });
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const utils = trpc.useUtils();
  const onChanged = (): void => {
    Promise.allSettled([
      utils.viewer.apps.integrations.invalidate(
        { variant: "calendar", onlyInstalled: true },
        {
          exact: true,
        }
      ),
      utils.viewer.calendars.connectedCalendars.invalidate(),
      revalidateSettingsCalendars(),
    ]);
  };
  const mutation = trpc.viewer.calendars.setDestinationCalendar.useMutation({
    onSuccess: () => {
      utils.viewer.calendars.connectedCalendars.invalidate();
      revalidateSettingsCalendars();
    },
  });

  let content = null;
  if (!!data.connectedCalendars.length || !!installedCalendars?.items.length) {
    let headingContent = null;
    if (heading) {
      headingContent = (
        <>
          <DestinationCalendarSettingsWebWrapper connectedCalendars={data} />
          <Suspense fallback={<SkeletonLoader />}>
            <SelectedCalendarsSettingsWebWrapper
              onChanged={onChanged}
              fromOnboarding={fromOnboarding}
              destinationCalendarId={data.destinationCalendar?.externalId}
              isPending={mutation.isPending}
              connectedCalendars={data}
            />
          </Suspense>
        </>
      );
    }
    content = headingContent;
  } else if (fromOnboarding) {
    content = (
      <>
        {!!data?.connectedCalendars.length && (
          <ShellSubHeading
            className="mt-4"
            title={<SubHeadingTitleWithConnections title={t("connect_additional_calendar")} />}
          />
        )}
        <CalendarList onChanged={onChanged} />
      </>
    );
  } else {
    content = (
      <EmptyScreen
        Icon="calendar"
        headline={t("no_category_apps", {
          category: t("calendar").toLowerCase(),
        })}
        description={t(`no_category_apps_description_calendar`)}
        buttonRaw={
          <Button color="secondary" data-testid="connect-calendar-apps" href="/apps/categories/calendar">
            {t(`connect_calendar_apps`)}
          </Button>
        }
      />
    );
  }

  return (
    <SettingsHeader
      title={t("calendars")}
      description={t("calendars_description")}
      CTA={<AddCalendarButton />}>
      {content}

      {/* Calendar Notifications Section */}
      <div className="border-subtle mt-8 rounded-b-xl border-x border-b px-4 pb-8 pt-6 sm:px-6">
        <ShellSubHeading
          title={t("calendar_notifications")}
          subtitle={t("calendar_notifications_description")}
        />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex-grow">
            <h3 className="text-emphasis text-sm font-medium leading-6">
              {t("unreachable_calendar_alerts")}
            </h3>
            <p className="text-subtle mt-1 text-sm">{t("unreachable_calendar_alerts_description")}</p>
          </div>
          <Switch
            checked={isNotifyCalendarAlertsChecked}
            onCheckedChange={handleCalendarNotificationToggle}
            disabled={loading}
            aria-label={t("unreachable_calendar_alerts")}
          />
        </div>
      </div>
    </SettingsHeader>
  );
}
