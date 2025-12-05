"use client";
/**
 * All hooks defined in this file must be client side hooks and must not be executed in server side.
 * So, they should start with isBrowser check.
 */
import { sdkActionManager } from "../sdk-event";
import { embedStore, getEventHasFired, setEventHasFired, getReloadInitiated, setReloadInitiated } from "./lib/embedStore";
import { isBrowser, isPrerendering } from "./lib/utils";

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
    const isFirstTime = embedStore.viewId === 1;
    const isReload = getReloadInitiated();
    const eventName = isReload ? "bookerReloaded" : isFirstTime ? "bookerViewed" : "bookerReopened";

    // Check if this specific event has already been fired
    const eventStateKey = eventName as "bookerViewed" | "bookerReopened" | "bookerReloaded";
    if (getEventHasFired(eventStateKey)) {
        return;
    }

    fireEvent(eventName);
    setEventHasFired(eventStateKey, true);

    // Reset reload flag after using it
    if (isReload) {
        setReloadInitiated(false);
    }

    function fireEvent(eventName: string) {
        if (slotsLoaded) {
            if (eventId && eventSlug) {
                sdkActionManager?.fire(eventName as "bookerViewed" | "bookerReopened" | "bookerReloaded", {
                    eventId,
                    eventSlug,
                    slotsLoaded: true,
                });
            } else {
                // This situation shouldn't arise but not throwing error because for a tracking event we don't want to crash booker
                console.error("BookerViewed event not fired because slotsLoaded is true but eventId or eventSlug are falsy");
            }
        } else {
            sdkActionManager?.fire(eventName as "bookerViewed" | "bookerReopened" | "bookerReloaded", {
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
    if (!getEventHasFired("bookerReady")) {
        sdkActionManager?.fire("bookerReady", { eventId, eventSlug });
        setEventHasFired("bookerReady", true);
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
    if (!isBrowser) {
        return;
    }
    const viewId = embedStore.viewId;

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

