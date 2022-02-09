import React, { Fragment } from "react";
import { useMutation } from "react-query";

import { QueryCell } from "@lib/QueryCell";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";

import DestinationCalendarSelector from "@components/DestinationCalendarSelector";
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
                    <ul className="space-y-2 p-4">
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
  const mutation = trpc.useMutation("viewer.setDestinationCalendar");

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
            <div className="sm:min-w-80 block max-w-full">
              <DestinationCalendarSelector
                onChange={mutation.mutate}
                isLoading={mutation.isLoading}
                value={query.data?.destinationCalendar?.externalId}
              />
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
