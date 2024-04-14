import Link from "next/link";
import { Fragment, useEffect } from "react";

import { InstallAppButton } from "@calcom/app-store/components";
import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
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
import AdditionalCalendarSelector from "@components/apps/AdditionalCalendarSelector";
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

// todo: @hariom extract this into packages/apps-store as "GeneralAppSettings"
function ConnectedCalendarsList(props: Props) {
  const { t } = useLocale();
  const query = trpc.viewer.connectedCalendars.useQuery(undefined, {
    suspense: true,
    refetchOnWindowFocus: false,
  });
  const { fromOnboarding, isPending } = props;
  return (
    <QueryCell
      query={query}
      empty={() => null}
      success={({ data }) => {
        if (!data.connectedCalendars.length) {
          return null;
        }

        return (
          <div className="border-subtle mt-6 rounded-lg border">
            <div className="border-subtle border-b p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-emphasis text-base font-semibold leading-5">
                    {t("check_for_conflicts")}
                  </h4>
                  <p className="text-default text-sm leading-tight">{t("select_calendars")}</p>
                </div>
                <div className="flex flex-col xl:flex-row xl:space-x-5">
                  {!!data.connectedCalendars.length && (
                    <div className="flex items-center">
                      <AdditionalCalendarSelector isPending={isPending} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <List noBorderTreatment className="p-6 pt-2">
              {data.connectedCalendars.map((item) => (
                <Fragment key={item.credentialId}>
                  {item.calendars ? (
                    <AppListCard
                      shouldHighlight
                      slug={item.integration.slug}
                      title={item.integration.name}
                      logo={item.integration.logo}
                      description={item.primary?.email ?? item.integration.description}
                      className="border-subtle mt-4 rounded-lg border"
                      actions={
                        <div className="flex w-32 justify-end">
                          <DisconnectIntegration
                            credentialId={item.credentialId}
                            trashIcon
                            onSuccess={props.onChanged}
                            buttonProps={{ className: "border border-default" }}
                          />
                        </div>
                      }>
                      <div className="border-subtle border-t">
                        {!fromOnboarding && (
                          <>
                            <p className="text-subtle px-5 pt-4 text-sm">{t("toggle_calendars_conflict")}</p>
                            <ul className="space-y-4 px-5 py-4">
                              {item.calendars.map((cal) => (
                                <CalendarSwitch
                                  key={cal.externalId}
                                  externalId={cal.externalId}
                                  title={cal.name || "Nameless calendar"}
                                  name={cal.name || "Nameless calendar"}
                                  type={item.integration.type}
                                  isChecked={cal.isSelected}
                                  destination={cal.externalId === props.destinationCalendarId}
                                  credentialId={cal.credentialId}
                                />
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </AppListCard>
                  ) : (
                    <Alert
                      severity="warning"
                      title={t("something_went_wrong")}
                      message={
                        <span>
                          <Link href={`/apps/${item.integration.slug}`}>{item.integration.name}</Link>:{" "}
                          {t("calendar_error")}
                        </span>
                      }
                      iconClassName="h-10 w-10 ml-2 mr-1 mt-0.5"
                      actions={
                        <div className="flex w-32 justify-end md:pr-1">
                          <DisconnectIntegration
                            credentialId={item.credentialId}
                            trashIcon
                            onSuccess={props.onChanged}
                            buttonProps={{ className: "border border-default" }}
                          />
                        </div>
                      }
                    />
                  )}
                </Fragment>
              ))}
            </List>
          </div>
        );
      }}
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
                    <ConnectedCalendarsList
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
