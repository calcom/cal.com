import { Fragment } from "react";
import { useMutation } from "react-query";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import Switch from "@calcom/ui/Switch";

import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

import AdditionalCalendarSelector from "@components/AdditionalCalendarSelector";
import DestinationCalendarSelector from "@components/DestinationCalendarSelector";
import { List } from "@components/List";
import { ShellSubHeading } from "@components/Shell";
import SkeletonLoader from "@components/apps/SkeletonLoader";

import DisconnectIntegration from "./DisconnectIntegration";
import IntegrationListItem from "./IntegrationListItem";
import SubHeadingTitleWithConnections from "./SubHeadingTitleWithConnections";

type Props = {
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
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
              key={item.title}
              title={item.title}
              imageSrc={item.imageSrc}
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
          <List>
            {data.connectedCalendars.map((item) => (
              <Fragment key={item.credentialId}>
                {item.calendars ? (
                  <IntegrationListItem
                    title={item.integration.title}
                    imageSrc={item.integration.imageSrc}
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
                    {!fromOnboarding && (
                      <>
                        <p className="px-4 pt-4 text-sm text-neutral-500">
                          Toggle the calendar(s) you want to check for conflicts to prevent double bookings.
                        </p>
                        <ul className="space-y-2 p-4">
                          {item.calendars.map((cal) => (
                            <CalendarSwitch
                              key={cal.externalId}
                              externalId={cal.externalId}
                              title={cal.name || "Nameless calendar"}
                              type={item.integration.type}
                              defaultSelected={cal.isSelected}
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

export function CalendarListContainer(props: { heading?: boolean; fromOnboarding?: boolean }) {
  const { t } = useLocale();
  const { heading = true, fromOnboarding } = props;
  const utils = trpc.useContext();
  const onChanged = () =>
    Promise.allSettled([
      utils.invalidateQueries(["viewer.integrations"]),
      utils.invalidateQueries(["viewer.connectedCalendars"]),
    ]);
  const query = trpc.useQuery(["viewer.connectedCalendars"]);
  const installedCalendars = trpc.useQuery([
    "viewer.integrations",
    { variant: "calendar", onlyInstalled: true },
  ]);
  const mutation = trpc.useMutation("viewer.setDestinationCalendar");
  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader className="mt-10" />}
      success={({ data }) => {
        return (
          <>
            {(!!data.connectedCalendars.length || !!installedCalendars.data?.items.length) && (
              <>
                {heading && (
                  <ShellSubHeading
                    className="mt-10 mb-0"
                    title={
                      <SubHeadingTitleWithConnections
                        title="Calendars"
                        numConnections={data.connectedCalendars.length}
                      />
                    }
                    subtitle={t("configure_how_your_event_types_interact")}
                    actions={
                      <div className="flex flex-col xl:flex-row xl:space-x-5">
                        <div className="sm:min-w-80 block max-w-full">
                          <DestinationCalendarSelector
                            onChange={mutation.mutate}
                            isLoading={mutation.isLoading}
                            value={data.destinationCalendar?.externalId}
                          />
                        </div>

                        {!!data.connectedCalendars.length && (
                          <div className="sm:min-w-80 inline max-w-full">
                            <AdditionalCalendarSelector isLoading={mutation.isLoading} />
                          </div>
                        )}
                      </div>
                    }
                  />
                )}
                <ConnectedCalendarsList onChanged={onChanged} fromOnboarding />
              </>
            )}
            {fromOnboarding && (
              <>
                {!!query.data?.connectedCalendars.length && (
                  <ShellSubHeading
                    className="mt-4"
                    title={<SubHeadingTitleWithConnections title={t("connect_additional_calendar")} />}
                  />
                )}
                <CalendarList onChanged={onChanged} />
              </>
            )}
          </>
        );
      }}
    />
  );
}
