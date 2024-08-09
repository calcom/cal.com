import { Fragment, useEffect } from "react";

import { InstallAppButton } from "@calcom/app-store/components";
import { CalendarSettingsWebWrapper } from "@calcom/atoms/monorepo";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  EmptyScreen,
  Label,
  List,
  ShellSubHeading,
  AppSkeletonLoader as SkeletonLoader,
  showToast,
} from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";
import useRouterQuery from "@lib/hooks/useRouterQuery";

import AppListCard from "@components/AppListCard";
import SubHeadingTitleWithConnections from "@components/integrations/SubHeadingTitleWithConnections";

type Props = {
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
  isPending?: boolean;
};

function CalendarList(props: Props) {
  const { t } = useLocale();
  const query = trpc.viewer.integrations.useQuery({ variant: "calendar", onlyInstalled: false });

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

export function CalendarListContainer(props: { heading?: boolean; fromOnboarding?: boolean }) {
  const { t } = useLocale();
  const { heading = true, fromOnboarding } = props;
  const { error, setQuery: setError } = useRouterQuery("error");

  useEffect(() => {
    if (error === "account_already_linked") {
      showToast(t(error), "error", { id: error });
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const utils = trpc.useUtils();
  const onChanged = () =>
    Promise.allSettled([
      utils.viewer.integrations.invalidate(
        { variant: "calendar", onlyInstalled: true },
        {
          exact: true,
        }
      ),
      utils.viewer.connectedCalendars.invalidate(),
    ]);
  const query = trpc.viewer.connectedCalendars.useQuery();
  const installedCalendars = trpc.viewer.integrations.useQuery({ variant: "calendar", onlyInstalled: true });
  const mutation = trpc.viewer.setDestinationCalendar.useMutation({
    onSuccess: () => {
      utils.viewer.connectedCalendars.invalidate();
    },
  });
  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader />}
      success={({ data }) => {
        return (
          <>
            {!!data.connectedCalendars.length || !!installedCalendars.data?.items.length ? (
              <>
                {heading && (
                  <>
                    <div className="border-subtle mb-6 mt-8 rounded-lg border">
                      <div className="p-6">
                        <h2 className="text-emphasis mb-1 text-base font-bold leading-5 tracking-wide">
                          {t("add_to_calendar")}
                        </h2>

                        <p className="text-subtle text-sm leading-tight">
                          {t("add_to_calendar_description")}
                        </p>
                      </div>
                      <div className="border-t">
                        <div className="border-subtle flex w-full flex-col space-y-3 border-y-0 p-6">
                          <div>
                            <Label className="text-default mb-0 font-medium">{t("add_events_to")}</Label>
                            <DestinationCalendarSelector
                              hidePlaceholder
                              value={data.destinationCalendar?.externalId}
                              onChange={mutation.mutate}
                              isPending={mutation.isPending}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <CalendarSettingsWebWrapper
                      onChanged={onChanged}
                      fromOnboarding={fromOnboarding}
                      destinationCalendarId={data.destinationCalendar?.externalId}
                      isPending={mutation.isPending}
                    />
                  </>
                )}
              </>
            ) : fromOnboarding ? (
              <>
                {!!query.data?.connectedCalendars.length && (
                  <ShellSubHeading
                    className="mt-4"
                    title={<SubHeadingTitleWithConnections title={t("connect_additional_calendar")} />}
                  />
                )}
                <CalendarList onChanged={onChanged} />
              </>
            ) : (
              <EmptyScreen
                Icon="calendar"
                headline={t("no_category_apps", {
                  category: t("calendar").toLowerCase(),
                })}
                description={t(`no_category_apps_description_calendar`)}
                buttonRaw={
                  <Button
                    color="secondary"
                    data-testid="connect-calendar-apps"
                    href="/apps/categories/calendar">
                    {t(`connect_calendar_apps`)}
                  </Button>
                }
              />
            )}
          </>
        );
      }}
    />
  );
}
