import { ArrowRightIcon } from "@heroicons/react/solid";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SkeletonAvatar, SkeletonText, SkeletonButton, List } from "@calcom/ui";

import { CalendarItem } from "../components/CalendarItem";
import { ConnectedCalendarItem } from "../components/ConnectedCalendarItem";
import { CreateEventsOnCalendarSelect } from "../components/CreateEventsOnCalendarSelect";

interface IConnectCalendarsProps {
  nextStep: () => void;
}

const ConnectedCalendars = (props: IConnectCalendarsProps) => {
  const { nextStep } = props;
  const queryConnectedCalendars = trpc.viewer.connectedCalendars.useQuery();
  const { t } = useLocale();
  const queryIntegrations = trpc.viewer.integrations.useQuery({ variant: "calendar", onlyInstalled: false });

  const firstCalendar = queryConnectedCalendars.data?.connectedCalendars.find(
    (item) => item.calendars && item.calendars?.length > 0
  );
  const disabledNextButton = firstCalendar === undefined;
  const destinationCalendar = queryConnectedCalendars.data?.destinationCalendar;
  return (
    <>
      {/* Already connected calendars  */}
      {!queryConnectedCalendars.isLoading &&
        firstCalendar &&
        firstCalendar.integration &&
        firstCalendar.integration.title &&
        firstCalendar.integration.logo && (
          <>
            <List className="bg-default border-subtle rounded-md border p-0 dark:bg-black">
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
                  <CalendarItem
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

      {queryIntegrations.isLoading && (
        <ul className="bg-default divide-subtle border-subtle divide-y rounded-md border p-0 dark:bg-black">
          {[0, 0, 0, 0].map((_item, index) => {
            return (
              <li className="flex w-full flex-row justify-center border-b-0 py-6" key={index}>
                <SkeletonAvatar className="mx-6 h-8 w-8 px-4" />
                <SkeletonText className="ml-1 mr-4 mt-3 h-5 w-full" />
                <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        data-testid="save-calendar-button"
        className={classNames(
          "text-inverted mt-8 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-sm",
          disabledNextButton ? "cursor-not-allowed opacity-20" : ""
        )}
        onClick={() => nextStep()}
        disabled={disabledNextButton}>
        {firstCalendar ? `${t("continue")}` : `${t("next_step_text")}`}
        <ArrowRightIcon className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </button>
    </>
  );
};

export { ConnectedCalendars };
