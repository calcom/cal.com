"use client";

import { sdkActionManager } from "../sdk-event";
import { embedStore } from "./lib/embedStore";

const isPrerendering = () => {
    if (typeof document === "undefined") {
        return false;
    }
    return new URL(document.URL).searchParams.get("prerender") === "true";
};

/**
 * Fires bookerViewed or bookerFocused events
 */
const fireBookerViewedEvent = ({
    eventId,
    eventSlug,
    slotsLoaded,
    reopenCount,
}: {
    eventId: number | undefined;
    eventSlug: string | undefined;
    slotsLoaded: boolean;
    reopenCount: number;
}) => {
    if (embedStore.eventsState.lastFiredForReopenCount !== reopenCount) {
        fireEvent(!embedStore.eventsState.lastFiredForReopenCount);
        embedStore.eventsState.lastFiredForReopenCount = embedStore.eventsState.reopenCount;
    }

    function fireEvent(isFirstTime: boolean) {
        if (slotsLoaded) {
            if (eventId && eventSlug) {
                sdkActionManager?.fire(isFirstTime ? "bookerViewed" : "bookerFocused", {
                    eventId,
                    eventSlug,
                    slotsLoaded: true,
                });
            } else {
                // This situation shouldn't arise but not throwing error because for a tracking event we don't want to crash booker
                console.error("BookerViewed event not fired because slotsLoaded is true but eventId or eventSlug are falsy");
            }
        } else {
            sdkActionManager?.fire(isFirstTime ? "bookerViewed" : "bookerFocused", {
                eventId: null,
                eventSlug: null,
                slotsLoaded: false,
            });
        }
    }
};

/**
 * Fires availabilityLoaded or availabilityRefreshed events.
 * Manages the lastAvailabilityDataUpdatedAt timestamp internally to distinguish initial load from refreshes.
 * Prevents firing events during prerender mode.
 */
const fireAvailabilityLoadedEvents = ({
    eventId,
    eventSlug,
    availabilityDataUpdateTime,
    slotsLoaded,
}: {
    eventId: number;
    eventSlug: string;
    availabilityDataUpdateTime: number;
    slotsLoaded: boolean;
}) => {
    if (!slotsLoaded) {
        return;
    }
    if (!embedStore.eventsState.lastAvailabilityDataUpdatedAt) {
        // First successful load - fire availabilityLoaded
        sdkActionManager?.fire("availabilityLoaded", { eventId, eventSlug });
    } else if (availabilityDataUpdateTime > embedStore.eventsState.lastAvailabilityDataUpdatedAt) {
        // Data was refreshed - fire availabilityRefreshed
        sdkActionManager?.fire("availabilityRefreshed", { eventId, eventSlug });
    }
    embedStore.eventsState.lastAvailabilityDataUpdatedAt = availabilityDataUpdateTime;
};

/**
 * Hook that fires embed events (bookerViewed/bookerFocused and availabilityLoaded/availabilityRefreshed).
 * Manages event state using embedStore to prevent duplicate events and track modal reopens.
 */
export const useBookerEmbedEvents = ({
    eventId,
    eventSlug,
    availabilityDataUpdateTime,
    schedule,
}: {
    eventId: number | undefined;
    eventSlug: string | undefined;
    availabilityDataUpdateTime: number;
    schedule: {
        isSuccess: boolean;
        dataUpdatedAt: number;
    };
}) => {
    if (typeof window === "undefined") {
        return;
    }
    const reopenCount = embedStore.eventsState.reopenCount;

    if (isPrerendering() || !reopenCount) {
        return;
    }
    // first BookerViewed event happens, followed by availabilityLoaded/availabilityRefreshed if they are loaded
    // In case of prerender, they can fire one after another as prerender -> non-prerender mode transition happens when slots data is fully ready
    fireBookerViewedEvent({
        eventId,
        eventSlug,
        slotsLoaded: schedule.isSuccess,
        reopenCount,
    });

    if (eventId && eventSlug) {
        fireAvailabilityLoadedEvents({
            eventId,
            eventSlug,
            slotsLoaded: schedule.isSuccess,
            availabilityDataUpdateTime,
        });
    }
};

export const useIsEmbedPrerendering = () => {
    // Hook must execute in browser environment
    if (typeof window === "undefined") {
        return false;
    }
    return isPrerendering();
};

