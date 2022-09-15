import { Fragment } from "react";
import { useMutation } from "react-query";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";
import { Alert, EmptyScreen } from "@calcom/ui/v2";
import { List } from "@calcom/ui/v2/core/List";
import { ShellSubHeading } from "@calcom/ui/v2/core/Shell";
import Switch from "@calcom/ui/v2/core/Switch";
import DisconnectIntegration from "@calcom/ui/v2/modules/integrations/DisconnectIntegration";

import { QueryCell } from "@lib/QueryCell";

import SubHeadingTitleWithConnections from "@components/integrations/SubHeadingTitleWithConnections";
import AdditionalCalendarSelector from "@components/v2/apps/AdditionalCalendarSelector";
import DestinationCalendarSelector from "@components/v2/apps/DestinationCalendarSelector";
import IntegrationListItem from "@components/v2/apps/IntegrationListItem";

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
        await utils.invalidateQueries(["viewer.integrations"]);
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
  const query = trpc.useQuery(["viewer.integrations", { variant: "calendar", onlyInstalled: false }]);

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

function ConnectedCalendarsList(props: Props) {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.connectedCalendars"], { suspense: true });
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
          <List className="flex flex-col gap-6">
            {data.connectedCalendars.map((item) => (
              <Fragment key={item.credentialId}>
                {item.calendars ? (
                  <IntegrationListItem
                    slug={item.integration.slug}
                    title={item.integration.title}
                    logo={item.integration.logo}
                    description={item.primary?.externalId || "No external Id"}
                    actions={
                      <div className="w-32">
                        <DisconnectIntegration
                          credentialId={item.credentialId}
                          trashIcon
                          onSuccess={props.onChanged}
                          buttonProps={{ className: "border border-gray-300" }}
                        />
                      </div>
                    }>
                    {!fromOnboarding && (
                      <>
                        <p className="px-4 pt-4 text-sm text-neutral-500">{t("toggle_calendars_conflict")}</p>
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
                  </IntegrationListItem>
                ) : (
                  <Alert
                    severity="warning"
                    title={t("calendar_error")}
                    message={item.error?.message}
                    actions={
                      <div className="w-32">
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
      utils.invalidateQueries(["viewer.integrations", { variant: "calendar", onlyInstalled: true }], {
        exact: true,
      }),
      utils.invalidateQueries(["viewer.connectedCalendars"]),
    ]);
  const query = trpc.useQuery(["viewer.connectedCalendars"]);
  const installedCalendars = trpc.useQuery([
    "viewer.integrations",
    { variant: "calendar", onlyInstalled: true },
  ]);
  const mutation = trpc.useMutation("viewer.setDestinationCalendar", {
    onSuccess: () => {
      utils.invalidateQueries(["viewer.connectedCalendars"]);
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
                      className="flex items-center"
                      actions={
                        <div className="flex flex-col xl:flex-row xl:space-x-5">
                          {!!data.connectedCalendars.length && (
                            <div className=" flex items-center">
                              <AdditionalCalendarSelector isLoading={mutation.isLoading} />
                            </div>
                          )}
                        </div>
                      }
                    />
                    <div className="flex justify-between rounded-md border border-gray-200 bg-gray-50 p-4">
                      <div className="flex w-full items-center gap-4">
                        <div className="relative rounded-md border border-gray-200 bg-white p-1.5">
                          <Icon.FiCalendar className="h-8 w-8" strokeWidth="1" />
                          <Icon.FiPlus
                            className="absolute left-4 top-1/2 ml-0.5 mt-[1px] h-2 w-2 text-black"
                            strokeWidth="4"
                          />
                        </div>
                        <div className="w-6/12">
                          <h1 className="text-sm font-semibold">{t("create_events_on")}</h1>
                          <p className="text-sm font-normal">{t("set_calendar")}</p>
                        </div>
                        <div className="flex w-6/12 justify-end">
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
                  <Button color="secondary" href="/apps/categories/calendar">
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
