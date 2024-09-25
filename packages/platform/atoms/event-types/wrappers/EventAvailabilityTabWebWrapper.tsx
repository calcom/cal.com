import { useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { EventAvailabilityTab } from "@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab";
import type { EventTypeSetup, FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

export type EventAvailabilityTabWebWrapperProps = {
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
};

const EventAvailabilityTabWebWrapper = (props: EventAvailabilityTabWebWrapperProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const scheduleId = formMethods.watch("schedule");
  const { data: loggedInUser } = useMeQuery();

  const { isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager({
    eventType: props.eventType,
    translate: t,
    formMethods,
  });

  const { isPending: isSchedulePending, data: scheduleQueryData } =
    trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId: scheduleId || loggedInUser?.defaultScheduleId || undefined,
        isManagedEventType: isManagedEventType || isChildrenManagedEventType,
      },
      { enabled: !!scheduleId || !!loggedInUser?.defaultScheduleId }
    );

  const { data: availabilityQueryData, isPending: isAvailabilityPending } =
    trpc.viewer.availability.list.useQuery(undefined);

  return (
    <EventAvailabilityTab
      {...props}
      loggedInUser={loggedInUser}
      availabilityQueryData={availabilityQueryData}
      isAvailabilityPending={isAvailabilityPending}
      isSchedulePending={isSchedulePending}
      scheduleQueryData={scheduleQueryData}
      editAvailabilityRedirectUrl={`/availability/${scheduleQueryData?.id}`}
    />
  );
};

export default EventAvailabilityTabWebWrapper;
