import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Fragment } from "react";

import { InstallAppButton } from "@calcom/app-store/components";
import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Button,
  EmptyScreen,
  Icon,
  List,
  showToast,
  AppSkeletonLoader as SkeletonLoader,
  Switch,
  ShellSubHeading,
} from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";

import AdditionalCalendarSelector from "@components/apps/AdditionalCalendarSelector";
import IntegrationListItem from "@components/apps/IntegrationListItem";
import SubHeadingTitleWithConnections from "@components/integrations/SubHeadingTitleWithConnections";

type Props = {
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
};

function CalendarSwitch(props: {
  type: string;
  externalId: string;
  title: string;
  defaultSelected: boolean;
  destination?: boolean;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const mutation = useMutation<
    unknown,
    unknown,
    {
      isOn: boolean;
    }
  >(
    async ({ isOn }) => {
      const body = {
        integration: props.type,
        externalId: props.externalId,
      };
      if (isOn) {
        const res = await fetch("/api/availability/calendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      } else {
        const res = await fetch("/api/availability/calendar", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      }
    },
    {
      async onSettled() {
        await utils.viewer.integrations.invalidate();
      },
      onError() {
        showToast(`Something went wrong when toggling "${props.title}""`, "error");
      },
    }
  );
  return (
    <div className="flex py-1">
      <Switch
        key={props.externalId}
        name="enabled"
        label={props.title}
        defaultChecked={props.defaultSelected}
        onCheckedChange={(isOn: boolean) => {
          mutation.mutate({ isOn });
        }}
      />
      {!!props.destination && (
        <span className="ml-4 inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-sm font-normal text-gray-800">
          <Icon.FiArrowLeft className="h-4 w-4" />
          {t("adding_events_to")}
        </span>
      )}
    </div>
  );
}

function CalendarList(props: Props) {
  const { t } = useLocale();
  const query = trpc.viewer.integrations.useQuery({ variant: "calendar", onlyInstalled: false });

  return (
    <QueryCell
      query={query}
      success={({ data }) => (
        <List>
          {data.items.map((item) => (
            <IntegrationListItem
              name={item.name}
              slug={item.slug}
              key={item.title}
              title={item.title}
              logo={item.logo}
              description={item.description}
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
  });
  const { fromOnboarding } = props;
  return (
    <QueryCell
      query={query}
      empty={() => null}
      success={({ data }) => {
        if (!data.connectedCalendars.length) {
          return null;
        }

        return (
          <List className="flex flex-col gap-6" noBorderTreatment>
            {data.connectedCalendars.map((item) => (
              <Fragment key={item.credentialId}>
                {item.calendars ? (
                  <IntegrationListItem
                    slug={item.integration.slug}
                    title={item.integration.title}
                    logo={item.integration.logo}
                    description={item.primary?.email ?? item.integration.description}
                    separate={true}
                    actions={
                      <div className="flex w-32 justify-end">
                        <DisconnectIntegration
                          credentialId={item.credentialId}
                          trashIcon
                          onSuccess={props.onChanged}
                          buttonProps={{ className: "border border-gray-300" }}
                        />
                      </div>
                    }>
                    <div className="border-t border-gray-200">
                      {!fromOnboarding && (
                        <>
                          <p className="px-4 pt-4 text-sm text-neutral-500">
                            {t("toggle_calendars_conflict")}
                          </p>
                          <ul className="space-y-2 p-4">
                            {item.calendars.map((cal) => (
                              <CalendarSwitch
                                key={cal.externalId}
                                externalId={cal.externalId}
                                title={cal.name || "Nameless calendar"}
                                type={item.integration.type}
                                defaultSelected={cal.isSelected}
                                destination={cal.externalId === props.destinationCalendarId}
                              />
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </IntegrationListItem>
                ) : (
                  <Alert
                    severity="warning"
                    title={t("something_went_wrong")}
                    message={
                      <span>
                        <Link href={"/apps/" + item.integration.slug}>{item.integration.name}</Link>:{" "}
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
                          buttonProps={{ className: "border border-gray-300" }}
                        />
                      </div>
                    }
                  />
                )}
              </Fragment>
            ))}
          </List>
        );
      }}
    />
  );
}

export function CalendarListContainer(props: { heading?: boolean; fromOnboarding?: boolean }) {
  const { t } = useLocale();
  const { heading = true, fromOnboarding } = props;
  const utils = trpc.useContext();
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
                  <div className="flex flex-col gap-6 rounded-md border border-gray-200 p-7">
                    <ShellSubHeading
                      title={t("calendar")}
                      subtitle={t("installed_app_calendar_description")}
                      className="mb-0 flex flex-wrap items-center gap-4 sm:flex-nowrap md:mb-3 md:gap-0"
                      actions={
                        <div className="flex flex-col xl:flex-row xl:space-x-5">
                          {!!data.connectedCalendars.length && (
                            <div className="flex items-center">
                              <AdditionalCalendarSelector isLoading={mutation.isLoading} />
                            </div>
                          )}
                        </div>
                      }
                    />
                    <div className="flex justify-between rounded-md border border-gray-200 bg-gray-50 p-4">
                      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center">
                        <div className="relative rounded-md border border-gray-200 bg-white p-1.5">
                          <Icon.FiCalendar className="h-8 w-8" strokeWidth="1" />
                          <Icon.FiPlus
                            className="absolute left-4 top-1/2 ml-0.5 mt-[1px] h-2 w-2 text-black"
                            strokeWidth="4"
                          />
                        </div>
                        <div className="md:w-6/12">
                          <h1 className="text-sm font-semibold">{t("create_events_on")}</h1>
                          <p className="text-sm font-normal">{t("set_calendar")}</p>
                        </div>
                        <div className="justify-end md:w-6/12">
                          <DestinationCalendarSelector
                            onChange={mutation.mutate}
                            hidePlaceholder
                            isLoading={mutation.isLoading}
                            value={data.destinationCalendar?.externalId}
                          />
                        </div>
                      </div>
                    </div>
                    <ConnectedCalendarsList
                      onChanged={onChanged}
                      fromOnboarding={fromOnboarding}
                      destinationCalendarId={data.destinationCalendar?.externalId}
                    />
                  </div>
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
                Icon={Icon.FiCalendar}
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
