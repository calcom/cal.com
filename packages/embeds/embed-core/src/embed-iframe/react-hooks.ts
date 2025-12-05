"use client";
/**
 * All hooks defined in this file must be client side hooks and must not be executed in server side.
 * So, they should start with isClientSide check.
 */
import { sdkActionManager } from "../sdk-event";
import { embedStore } from "./lib/embedStore";

function isClientSide() {
    return typeof window !== "undefined";
}

const isPrerendering = () => {
    return new URL(window.document.URL).searchParams.get("prerender") === "true";
};

/**
 * Fires bookerViewed, bookerReopened, or bookerReloaded events
 */
const fireBookerViewedEvent = ({
    eventId,
    eventSlug,
    slotsLoaded,
}: {
    eventId: number | undefined;
    eventSlug: string | undefined;
    slotsLoaded: boolean;
}) => {
    if (!embedStore.eventsState.bookerViewedFamily.hasFired) {
        const isFirstTime = embedStore.eventsState.viewId === 1;
        // Fire bookerReloaded if reload was initiated, otherwise use normal logic
        const isReload = embedStore.eventsState.reloadInitiated;
        fireEvent(isFirstTime, isReload);
        embedStore.eventsState.bookerViewedFamily.hasFired = true;
        // Reset reload flag after using it
        if (isReload) {
            embedStore.eventsState.reloadInitiated = false;
        }
    }

    function fireEvent(isFirstTime: boolean, isReload: boolean) {
        const eventName = isReload ? "bookerReloaded" : isFirstTime ? "bookerViewed" : "bookerReopened";
        if (slotsLoaded) {
            if (eventId && eventSlug) {
                sdkActionManager?.fire(eventName, {
                    eventId,
                    eventSlug,
                    slotsLoaded: true,
                });
            } else {
                // This situation shouldn't arise but not throwing error because for a tracking event we don't want to crash booker
                console.error("BookerViewed event not fired because slotsLoaded is true but eventId or eventSlug are falsy");
            }
        } else {
            sdkActionManager?.fire(eventName, {
                eventId: null,
                eventSlug: null,
                slotsLoaded: false,
            });
        }
    }
};

/**
 * Fires bookerReady event when booker view is loaded and slots are ready.
 * Only fires once per link view when slots are successfully loaded.
 */
const fireBookerReadyEvent = ({
    eventId,
    eventSlug,
    slotsLoaded,
}: {
    eventId: number;
    eventSlug: string;
    slotsLoaded: boolean;
}) => {
    if (!slotsLoaded) {
        return;
    }
    if (!embedStore.eventsState.bookerReady.hasFired) {
        sdkActionManager?.fire("bookerReady", { eventId, eventSlug });
        embedStore.eventsState.bookerReady.hasFired = true;
    }
};

/**
 * Hook that fires embed events (bookerViewed/bookerReopened/bookerReloaded and bookerReady).
 * Manages event state using embedStore to prevent duplicate events and track modal reopens/reloads.
 */
export const useBookerEmbedEvents = ({
    eventId,
    eventSlug,
    schedule,
}: {
    eventId: number | undefined;
    eventSlug: string | undefined;
    schedule: {
        isSuccess: boolean;
        dataUpdatedAt: number;
    };
}) => {
    if (!isClientSide()) {
        return;
    }
    const viewId = embedStore.eventsState.viewId;

    if (isPrerendering() || !viewId) {
        return;
    }
    // first BookerViewed event happens, followed by bookerReady if slots are loaded
    // In case of prerender, they can fire one after another as prerender -> non-prerender mode transition happens when slots data is fully ready
    fireBookerViewedEvent({
        eventId,
        eventSlug,
        slotsLoaded: schedule.isSuccess,
    });

    if (eventId && eventSlug) {
        fireBookerReadyEvent({
            eventId,
            eventSlug,
            slotsLoaded: schedule.isSuccess,
        });
    }
};

export const useIsEmbedPrerendering = () => {
    if (!isClientSide()) {
        return false;
    }
    return isPrerendering();
};

