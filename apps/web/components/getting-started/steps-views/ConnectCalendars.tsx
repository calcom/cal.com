import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { List } from "@calcom/ui/components/list";
import { triggerToast } from "@calid/features/ui/components/toast";
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

  const updateProfileMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (_data, _context) => {
      nextStep();
    },
    onError: () => {
      triggerToast(t("problem_saving_user_profile"), "error");
    },
  });

  const handleNextStep = () => {
    updateProfileMutation.mutate({
      metadata: {
        currentOnboardingStep: "connected-video",
      },
    });
  };

  const queryConnectedCalendars = trpc.viewer.calendars.connectedCalendars.useQuery({
    onboarding: true,
    eventTypeId: null,
  });
  const { t } = useLocale();
  const queryIntegrations = trpc.viewer.apps.calid_integrations.useQuery({
    variant: "calendar",
    onlyInstalled: false,
    sortByMostPopular: true,
  });

  const firstCalendar = queryConnectedCalendars.data?.connectedCalendars.find(
    (item) => item.calendars && item.calendars?.length > 0
  );
  const disabledNextButton = firstCalendar === undefined;
  const destinationCalendar = queryConnectedCalendars.data?.destinationCalendar;
  
  // Show skeleton loader if any query is pending (like ConnectedVideoStep)
  const isAnyQueryPending = queryConnectedCalendars.isPending || queryIntegrations.isPending;
  return (
    <>
      {!isAnyQueryPending && (
        <>
          {/* Already connected calendars  */}
          {firstCalendar &&
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
        <List className="bg-default border-subtle divide-subtle scroll-bar mx-1 max-h-[45vh] divide-y !overflow-y-scroll rounded-md border p-0 sm:mx-0">
          {queryIntegrations.data &&
            queryIntegrations.data.items.map((item) => (
              <li key={item.title}>
                {item.title && item.logo && (
                  <AppConnectionItem
                    type={item.type}
                    title={item.title}
                    description={item.description}
                    logo={item.logo}
                    slug={item.slug}
                    installed={item.userCredentialIds.length > 0}
                    defaultInstall={item.appData?.location?.linkType === "dynamic"}
                  />
                )}
              </li>
            ))}
          </List>
          )}
        </>
      )}

      {isAnyQueryPending && <StepConnectionLoader />}

      <Button
        color="primary"
        EndIcon="arrow-right"
        data-testid="save-calendar-button"
        className={cn(
          "mt-8 flex w-full flex-row justify-center rounded-md border text-center text-sm bg-active dark:bg-gray-200 border-active dark:border-default",
          disabledNextButton ? "cursor-not-allowed opacity-20" : ""
        )}
        loading={isPageLoading}
        onClick={() => {
          handleNextStep();
          nextStep();
        }}
        disabled={disabledNextButton}>
        {firstCalendar ? `${t("continue")}` : `${t("next_step_text")}`}
      </Button>
    </>
  );
};

export { ConnectedCalendars };
