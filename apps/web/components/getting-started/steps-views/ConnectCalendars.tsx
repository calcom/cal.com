import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { List } from "@calcom/ui/components/list";

import { AppConnectionItem } from "../components/AppConnectionItem";
import { ConnectedCalendarItem } from "../components/ConnectedCalendarItem";
import { CreateEventsOnCalendarSelect } from "../components/CreateEventsOnCalendarSelect";
import { StepConnectionLoader } from "../components/StepConnectionLoader";

interface IConnectCalendarsProps {
  nextStep: () => void;
  isPageLoading: boolean;
}

const ConnectedCalendars = (props: IConnectCalendarsProps) => {
  const { nextStep, isPageLoading } = props;
  const queryConnectedCalendars = trpc.viewer.calendars.connectedCalendars.useQuery({
    onboarding: true,
    eventTypeId: null,
  });
  const { t } = useLocale();
  const queryIntegrations = trpc.viewer.apps.integrations.useQuery({
    variant: "calendar",
    onlyInstalled: false,
    sortByMostPopular: true,
  });

  const firstCalendar = queryConnectedCalendars.data?.connectedCalendars.find(
    (item) => item.calendars && item.calendars?.length > 0
  );
  const disabledNextButton = firstCalendar === undefined;
  const destinationCalendar = queryConnectedCalendars.data?.destinationCalendar;
  return (
    <>
      {/* Already connected calendars  */}
      {!queryConnectedCalendars.isPending &&
        firstCalendar &&
        firstCalendar.integration &&
        firstCalendar.integration.title &&
        firstCalendar.integration.logo && (
          <>
            <List className="bg-default border-subtle rounded-md border p-0 dark:bg-black ">
              <ConnectedCalendarItem
                key={firstCalendar.integration.title}
                name={firstCalendar.integration.title}
                logo={firstCalendar.integration.logo}
                externalId={
                  firstCalendar && firstCalendar.calendars && firstCalendar.calendars.length > 0
                    ? firstCalendar.calendars[0].externalId
                    : ""
                }
                calendars={firstCalendar.calendars}
                integrationType={firstCalendar.integration.type}
              />
            </List>
            {/* Create event on selected calendar */}
            <CreateEventsOnCalendarSelect calendar={destinationCalendar} />
            <p className="text-subtle mt-4 text-sm">{t("connect_calendars_from_app_store")}</p>
          </>
        )}

      {/* Connect calendars list */}
      {firstCalendar === undefined && queryIntegrations.data && queryIntegrations.data.items.length > 0 && (
        <List className="bg-default divide-subtle border-subtle mx-1 divide-y rounded-md border p-0 dark:bg-black sm:mx-0">
          {queryIntegrations.data &&
            queryIntegrations.data.items.map((item) => (
              <li key={item.title}>
                {item.title && item.logo && (
                  <AppConnectionItem
                    type={item.type}
                    title={item.title}
                    description={item.description}
                    logo={item.logo}
                  />
                )}
              </li>
            ))}
        </List>
      )}

      {queryIntegrations.isPending && <StepConnectionLoader />}

      <Button
        EndIcon="arrow-right"
        data-testid="save-calendar-button"
        className={classNames(
          "text-inverted bg-inverted border-inverted mt-8 flex w-full flex-row justify-center rounded-md border p-2 text-center text-sm",
          disabledNextButton ? "cursor-not-allowed opacity-20" : ""
        )}
        loading={isPageLoading}
        onClick={() => nextStep()}
        disabled={disabledNextButton}>
        {firstCalendar ? `${t("connect_your_video")}` : `${t("connect_calendar_first")}`}
      </Button>
    </>
  );
};

export { ConnectedCalendars };
