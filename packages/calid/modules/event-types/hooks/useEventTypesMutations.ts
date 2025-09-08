import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { triggerToast } from "@calid/features/ui/components/toast";
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

  const queryKey = {
    limit: LIMIT,
    searchQuery: debouncedSearchTerm,
    group: {
      teamId: currentTeam?.teamId || null,
      parentId: currentTeam?.parentId || null,
    },
  };

  // Event type order mutation
  const eventTypeOrderMutation = trpc.viewer.loggedInViewerRouter.eventTypeOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      triggerToast("Failed to update event order. Order has been reverted.", "error");
    },
  });

  // Set hidden mutation (toggle visibility)
  const setHiddenMutation = trpc.viewer.eventTypes.update.useMutation({
    onMutate: async (data) => {
      await utils.viewer.eventTypes.getEventTypesFromGroup.cancel();
      const previousValue = utils.viewer.eventTypes.getEventTypesFromGroup.getInfiniteData(queryKey);

      if (previousValue) {
        utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(queryKey, (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              eventTypes: page.eventTypes.map((eventType) =>
                eventType.id === data.id ? { ...eventType, hidden: !eventType.hidden } : eventType
              ),
            })),
          };
        });
      }

      return { previousValue };
    },
    onError: async (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(queryKey, context.previousValue);
      }
      console.error(err.message);
      triggerToast("Failed to update event visibility", "error");
    },
    onSuccess: () => {
      triggerToast("Event visibility updated", "success");
    },
  });

  // Delete mutation
  const deleteMutation = trpc.viewer.eventTypes.delete.useMutation({
    onSuccess: () => {
      triggerToast(t("event_type_deleted_successfully"), "success");
    },
    onMutate: async ({ id }) => {
      await utils.viewer.eventTypes.getEventTypesFromGroup.cancel();
      const previousValue = utils.viewer.eventTypes.getEventTypesFromGroup.getInfiniteData(queryKey);

      if (previousValue) {
        await utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(queryKey, (data) => {
          if (!data) {
            return { pages: [], pageParams: [] };
          }
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              eventTypes: page.eventTypes.filter((type) => type.id !== id),
            })),
          };
        });
      }

      return { previousValue };
    },
    onError: (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(queryKey, context.previousValue);
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
    async (reorderedEvents: any[], allEvents: any[]) => {
      try {
        await utils.viewer.eventTypes.getEventTypesFromGroup.cancel();

        const previousValue = utils.viewer.eventTypes.getEventTypesFromGroup.getInfiniteData(queryKey);

        // Optimistically update the cache
        utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(queryKey, (data) => {
          if (!data) return { pages: [], pageParams: [] };

          const updatedPages = [...data.pages];
          if (updatedPages[0]) {
            updatedPages[0] = {
              ...updatedPages[0],
              eventTypes: reorderedEvents.slice(0, LIMIT),
            };
          }

          return {
            ...data,
            pages: updatedPages,
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
        await utils.viewer.eventTypes.getEventTypesFromGroup.invalidate(queryKey);
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
