import { useAutoAnimate } from "@formkit/auto-animate/react";

import { EventTypeListItem } from "@calcom/features/eventtypes/components/EventTypeListItem";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import { useDeleteEventTypeById } from "../../hooks/event-types/private/useDeleteEventTypeById";
import { AtomsWrapper } from "../../../src/components/atoms-wrapper";
import { useToast } from "../../../src/components/ui/use-toast";
import { useAtomGetAllEventTypes } from "../hooks/useAtomGetAllEventTypes";

interface ListEventTypesPlatformWrapperProps {
  getEventTypeUrl?: (eventTypeId: number) => string;
}

export const ListEventTypesPlatformWrapper = ({
  getEventTypeUrl,
}: ListEventTypesPlatformWrapperProps = {}) => {
  const [animationParentRef] = useAutoAnimate<HTMLUListElement>();
  const { toast } = useToast();
  const { t } = useLocale();

  const {
    data: eventTypes,
    isLoading: isLoadingEventTypes,
    refetch: refetchEventTypes,
  } = useAtomGetAllEventTypes();

  const { mutate: deleteEventType } = useDeleteEventTypeById({
    onSuccess: () => {
      toast({
        description: t("event_type_deleted_successfully"),
      });
      refetchEventTypes();
    },
    onError: (err) => {
      toast({
        description: err.message,
      });
    },
  });

  if (isLoadingEventTypes) {
    return <>{t("loading")}</>;
  }

  if (!isLoadingEventTypes && (!eventTypes || eventTypes.length === 0)) {
    return (
      <EmptyScreen
        Icon="calendar"
        headline={t("no_event_types_yet")}
        description={t("create_your_first_event_type")}
        className="w-full"
      />
    );
  }

  return (
    <AtomsWrapper>
      <div className="border-subtle bg-default overflow-hidden rounded-md border">
        <ul className="divide-subtle divide-y" data-testid="event-types" ref={animationParentRef}>
          {eventTypes?.map((eventType) => (
            <EventTypeListItem
              key={eventType.id}
              eventType={eventType}
              deleteFunction={({ eventTypeId }) => deleteEventType(eventTypeId)}
              isDeletable={true}
              getEventTypeUrl={getEventTypeUrl}
            />
          ))}
        </ul>
      </div>
    </AtomsWrapper>
  );
};