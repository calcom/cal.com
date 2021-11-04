import React, { Fragment, useState } from "react";
import { useMutation } from "react-query";
import Select from "react-select";

import { QueryCell } from "@lib/QueryCell";
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
                          <Button {...btnProps} color="warn">
                            Disconnect
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
                          <Button {...btnProps} color="warn">
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
  const query = trpc.useQuery(["viewer.connectedCalendars"], {
    suspense: true,
  });
  const [selectedOption, setSelectedOption] = useState(() => {
    const selected = query.data?.connectedCalendars
      .map((connected) => connected.calendars ?? [])
      .flat()
      .find((cal) => cal.externalId === query.data.DestinationCalendar?.externalId);

    if (!selected) {
      return null;
    }

    return {
      value: `${selected.integration}:${selected.externalId}`,
      label: selected.name,
    };
  });

  const mutation = trpc.useMutation("viewer.setDestinationCalendar");

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
    <Select
      name={"primarySelectedCalendar"}
      options={options}
      isSearchable={false}
      className="flex-1 block w-full min-w-0 mt-1 mb-2 border-gray-300 rounded-none focus:ring-primary-500 focus:border-primary-500 rounded-r-md sm:text-sm"
      onChange={(option) => {
        setSelectedOption(option);
        if (!option) {
          return;
        }

        const [integration, externalId] = option.value.split(":");
        mutation.mutate({
          integration,
          externalId,
        });
      }}
      isLoading={mutation.isLoading}
      value={selectedOption}
    />
  );
}

function CalendarList(props: Props) {
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
                    <Button color="secondary" {...btnProps}>
                      Connect
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
          className="mt-10"
          title={
            <SubHeadingTitleWithConnections
              title="Calendars"
              numConnections={query.data?.connectedCalendars.length}
            />
          }
          subtitle={
            <>
              Configure how your links integrate with your calendars.
              <br />
              You can override these settings on a per event basis.
            </>
          }
          actions={<div className="block"></div>}
        />
      )}
      <PrimaryCalendarSelector />
      <ConnectedCalendarsList onChanged={onChanged} />
      {!!query.data?.connectedCalendars.length && (
        <ShellSubHeading
          className="mt-6"
          title={<SubHeadingTitleWithConnections title="Connect an additional calendar" />}
        />
      )}
      <CalendarList onChanged={onChanged} />
    </>
  );
}
