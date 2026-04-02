import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useDeleteEventTypeById } from "../../hooks/event-types/private/useDeleteEventTypeById";
import { useToast } from "../../src/components/ui/use-toast";
import { EventTypeListItem } from "../components/EventTypeListItem";
import { useAtomGetAllEventTypes } from "../hooks/useAtomGetAllEventTypes";
import { AtomsWrapper } from "@/components/atoms-wrapper";

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
    error,
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

  if (error) {
    return (
      <EmptyScreen
        Icon="alert-circle"
        headline={t("error_loading_event_types")}
        description={error.message}
        className="w-full"
      />
    );
  }

  if (!isLoadingEventTypes && (!eventTypes || eventTypes.length === 0)) {
    return (
      <EmptyScreen
        Icon="calendar"
        headline={t("no_event_types")}
        description={t("no_event_types_have_been_setup")}
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
