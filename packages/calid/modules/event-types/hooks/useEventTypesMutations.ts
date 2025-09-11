import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";

import { TRPCClientError } from "@trpc/client";

import { LIMIT } from "../types/event-types";
import type { InfiniteEventTypeGroup } from "../types/event-types";

export const useEventTypesMutations = (
  currentTeam: InfiniteEventTypeGroup | undefined,
  debouncedSearchTerm: string
) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const queryKey = useMemo(
    () => ({
      limit: LIMIT,
      searchQuery: debouncedSearchTerm,
      group: {
        calIdTeamId: currentTeam?.teamId || null,
      },
    }),
    [debouncedSearchTerm, currentTeam?.teamId]
  );

  // Event type order mutation
  const eventTypeOrderMutation = trpc.viewer.loggedInViewerRouter.calid_eventTypeOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      triggerToast("Failed to update event order. Order has been reverted.", "error");
    },
  });

  // Set hidden mutation (toggle visibility)
  const setHiddenMutation = trpc.viewer.eventTypes.calid_update.useMutation({
    onMutate: async (data) => {
      await utils.viewer.eventTypes.calid_getEventTypesFromGroup.cancel();
      const previousValue = utils.viewer.eventTypes.calid_getEventTypesFromGroup.getData(queryKey);

      if (previousValue) {
        utils.viewer.eventTypes.calid_getEventTypesFromGroup.setData(queryKey, (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            eventTypes: oldData.eventTypes.map((eventType) =>
              eventType.id === data.id ? { ...eventType, hidden: !eventType.hidden } : eventType
            ),
          };
        });
      }

      return { previousValue };
    },
    onError: async (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.calid_getEventTypesFromGroup.setData(queryKey, context.previousValue);
      }
      console.error(err.message);
      triggerToast("Failed to update event visibility", "error");
    },
    onSuccess: () => {
      triggerToast("Event visibility updated", "success");
    },
  });

  // Delete mutation
  const deleteMutation = trpc.viewer.eventTypes.calid_delete.useMutation({
    onSuccess: () => {
      triggerToast(t("event_type_deleted_successfully"), "success");
    },
    onMutate: async ({ id }) => {
      await utils.viewer.eventTypes.calid_getEventTypesFromGroup.cancel();
      const previousValue = utils.viewer.eventTypes.calid_getEventTypesFromGroup.getData(queryKey);

      if (previousValue) {
        await utils.viewer.eventTypes.calid_getEventTypesFromGroup.setData(queryKey, (data) => {
          if (!data) {
            return { eventTypes: [], nextCursor: undefined };
          }
          return {
            ...data,
            eventTypes: data.eventTypes.filter((type) => type.id !== id),
          };
        });
      }

      return { previousValue };
    },
    onError: (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.calid_getEventTypesFromGroup.setData(queryKey, context.previousValue);
      }

      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        triggerToast(message, "error");
      } else if (err instanceof TRPCClientError) {
        triggerToast(err.message, "error");
      } else {
        triggerToast("Failed to delete event type", "error");
      }
    },
  });

  // Handler functions
  const handleEventEdit = useCallback(
    (eventId: number) => {
      router.push(`/event-types/${eventId}?tabName=setup`);
    },
    [router]
  );

  const handleToggleEvent = useCallback(
    (eventId: number, checked: boolean) => {
      setHiddenMutation.mutate({ id: eventId, hidden: !checked });
    },
    [setHiddenMutation]
  );

  const handleDeleteEvent = useCallback(
    (eventId: number) => {
      deleteMutation.mutate({ id: eventId });
    },
    [deleteMutation]
  );

  const handleReorderEvents = useCallback(
    async (reorderedEvents: InfiniteEventType[], allEvents: InfiniteEventType[]) => {
      try {
        await utils.viewer.eventTypes.calid_getEventTypesFromGroup.cancel();

        const _previousValue = utils.viewer.eventTypes.calid_getEventTypesFromGroup.getData(queryKey);

        // Optimistically update the cache
        utils.viewer.eventTypes.calid_getEventTypesFromGroup.setData(queryKey, (data) => {
          if (!data) return { eventTypes: [], nextCursor: undefined };

          return {
            ...data,
            eventTypes: reorderedEvents.slice(0, LIMIT),
          };
        });

        // Send all IDs in the new order
        const reorderedIds = reorderedEvents.map((type) => type.id);
        const otherIds = allEvents.filter((et) => !reorderedIds.includes(et.id)).map((et) => et.id);
        const allIds = [...reorderedIds, ...otherIds];

        await eventTypeOrderMutation.mutateAsync({ ids: allIds });
        triggerToast("Event order updated successfully", "success");
      } catch (error) {
        console.error("Failed to reorder events:", error);

        // Invalidate and refetch on error
        await utils.viewer.eventTypes.calid_getEventTypesFromGroup.invalidate(queryKey);
        triggerToast("Failed to update event order. Order has been reverted.", "error");
      }
    },
    [utils, queryKey, eventTypeOrderMutation]
  );

  return {
    mutations: {
      setHidden: setHiddenMutation,
      delete: deleteMutation,
      eventTypeOrder: eventTypeOrderMutation,
    },
    handlers: {
      handleEventEdit,
      handleToggleEvent,
      handleDeleteEvent,
      handleReorderEvents,
    },
  };
};
