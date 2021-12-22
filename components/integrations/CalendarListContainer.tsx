import React, { Fragment, useState } from "react";
import { useMutation } from "react-query";
import Select from "react-select";

import { QueryCell } from "@lib/QueryCell";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";

import { List } from "@components/List";
import { ShellSubHeading } from "@components/Shell";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";
import Switch from "@components/ui/Switch";

import ConnectIntegration from "./ConnectIntegrations";
import DisconnectIntegration from "./DisconnectIntegration";
import IntegrationListItem from "./IntegrationListItem";
import SubHeadingTitleWithConnections from "./SubHeadingTitleWithConnections";

type Props = {
  onChanged: () => unknown | Promise<unknown>;
};

function CalendarSwitch(props: {
  type: string;
  externalId: string;
  title: string;
  defaultSelected: boolean;
}) {
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
    <div className="py-1">
      <Switch
        key={props.externalId}
        name="enabled"
        label={props.title}
        defaultChecked={props.defaultSelected}
        onCheckedChange={(isOn: boolean) => {
          mutation.mutate({ isOn });
        }}
      />
    </div>
  );
}

function ConnectedCalendarsList(props: Props) {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.connectedCalendars"], { suspense: true });

  return (
    <QueryCell
      query={query}
      empty={() => null}
      success={({ data }) => {
        if (!data.connectedCalendars.length) {
          return null;
        }
        return (
          <List>
            {data.connectedCalendars.map((item) => (
              <Fragment key={item.credentialId}>
                {item.calendars ? (
                  <IntegrationListItem
                    {...item.integration}
                    description={item.primary?.externalId || "No external Id"}
                    actions={
                      <DisconnectIntegration
                        id={item.credentialId}
                        render={(btnProps) => (
                          <Button {...btnProps} color="warn" data-testid="integration-connection-button">
                            {t("disconnect")}
                          </Button>
                        )}
                        onOpenChange={props.onChanged}
                      />
                    }>
                    <ul className="p-4 space-y-2">
                      {item.calendars.map((cal) => (
                        <CalendarSwitch
                          key={cal.externalId}
                          externalId={cal.externalId as string}
                          title={cal.name as string}
                          type={item.integration.type}
                          defaultSelected={cal.isSelected}
                        />
                      ))}
                    </ul>
                  </IntegrationListItem>
                ) : (
                  <Alert
                    severity="warning"
                    title="Something went wrong"
                    message={item.error?.message}
                    actions={
                      <DisconnectIntegration
                        id={item.credentialId}
                        render={(btnProps) => (
                          <Button {...btnProps} color="warn" data-testid="integration-connection-button">
                            Disconnect
                          </Button>
                        )}
                        onOpenChange={() => props.onChanged()}
                      />
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

function PrimaryCalendarSelector() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.connectedCalendars"], {
    suspense: true,
  });
  const [selectedOption, setSelectedOption] = useState(() => {
    const selected = query.data?.connectedCalendars
      .map((connected) => connected.calendars ?? [])
      .flat()
      .find((cal) => cal.externalId === query.data.destinationCalendar?.externalId);

    if (!selected) {
      return null;
    }

    return {
      value: `${selected.integration}:${selected.externalId}`,
      label: selected.name,
    };
  });

  const mutation = trpc.useMutation("viewer.setUserDestinationCalendar");

  if (!query.data?.connectedCalendars.length) {
    return null;
  }
  const options =
    query.data.connectedCalendars.map((selectedCalendar) => ({
      key: selectedCalendar.credentialId,
      label: `${selectedCalendar.integration.title} (${selectedCalendar.primary?.name})`,
      options: (selectedCalendar.calendars ?? []).map((cal) => ({
        label: cal.name || "",
        value: `${cal.integration}:${cal.externalId}`,
      })),
    })) ?? [];
  return (
    <div className="relative">
      {/* There's no easy way to customize the displayed value for a Select, so we fake it. */}
      <div className="absolute z-10 pointer-events-none">
        <Button size="sm" color="secondary" className="border-transparent m-[1px] rounded-sm">
          {t("select_destination_calendar")}: {selectedOption?.label || ""}
        </Button>
      </div>
      <Select
        name={"primarySelectedCalendar"}
        placeholder={`${t("select_destination_calendar")}:`}
        options={options}
        isSearchable={false}
        className="flex-1 block w-full min-w-0 mt-1 mb-2 border-gray-300 rounded-none focus:ring-primary-500 focus:border-primary-500 rounded-r-md sm:text-sm"
        onChange={(option) => {
          setSelectedOption(option);
          if (!option) {
            return;
          }

          /* Split only the first `:`, since Apple uses the full URL as externalId */
          const [integration, externalId] = option.value.split(/:(.+)/);

          mutation.mutate({
            integration,
            externalId,
          });
        }}
        isLoading={mutation.isLoading}
        value={selectedOption}
      />
    </div>
  );
}

function CalendarList(props: Props) {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations"]);

  return (
    <QueryCell
      query={query}
      success={({ data }) => (
        <List>
          {data.calendar.items.map((item) => (
            <IntegrationListItem
              key={item.title}
              {...item}
              actions={
                <ConnectIntegration
                  type={item.type}
                  render={(btnProps) => (
                    <Button color="secondary" {...btnProps} data-testid="integration-connection-button">
                      {t("connect")}
                    </Button>
                  )}
                  onOpenChange={() => props.onChanged()}
                />
              }
            />
          ))}
        </List>
      )}
    />
  );
}
export function CalendarListContainer(props: { heading?: false }) {
  const { t } = useLocale();
  const { heading = true } = props;
  const utils = trpc.useContext();
  const onChanged = () =>
    Promise.allSettled([
      utils.invalidateQueries(["viewer.integrations"]),
      utils.invalidateQueries(["viewer.connectedCalendars"]),
    ]);
  const query = trpc.useQuery(["viewer.connectedCalendars"]);
  return (
    <>
      {heading && (
        <ShellSubHeading
          className="mt-10 mb-0"
          title={
            <SubHeadingTitleWithConnections
              title="Calendars"
              numConnections={query.data?.connectedCalendars.length}
            />
          }
          subtitle={t("configure_how_your_event_types_interact")}
          actions={
            <div className="block max-w-full sm:min-w-80">
              <PrimaryCalendarSelector />
            </div>
          }
        />
      )}
      <ConnectedCalendarsList onChanged={onChanged} />
      {!!query.data?.connectedCalendars.length && (
        <ShellSubHeading
          className="mt-6"
          title={<SubHeadingTitleWithConnections title={t("connect_an_additional_calendar")} />}
        />
      )}
      <CalendarList onChanged={onChanged} />
    </>
  );
}
