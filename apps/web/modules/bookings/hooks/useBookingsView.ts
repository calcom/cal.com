import { createParser, useQueryState } from "nuqs";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { localStorage } from "@calcom/lib/webstorage";

const STORAGE_KEY = "bookings-preferred-view";

type BookingView = "list" | "calendar";

const viewParser = createParser({
  parse: (value: string) => {
    if (value === "calendar") return "calendar";
    return "list";
  },
  serialize: (value: BookingView) => value,
});

// Create a store for localStorage value
const createLocalStorageStore = () => {
  let listeners: Array<() => void> = [];

  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  };

  const getSnapshot = (): BookingView => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "list" || stored === "calendar") {
      return stored;
    }
    return "list";
  };

  const getServerSnapshot = (): BookingView => {
    return "list";
  };

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  return { subscribe, getSnapshot, getServerSnapshot, notify };
};

const localStorageStore = createLocalStorageStore();

type UseBookingsViewOptions = {
  bookingsV3Enabled: boolean;
};

export function useBookingsView({ bookingsV3Enabled }: UseBookingsViewOptions) {
  // Always use "list" as the default for useQueryState to keep instances in sync
  const [_view, setView] = useQueryState("view", viewParser.withDefault("list"));

  // Track if we've completed the initial sync to prevent race conditions
  const isInitializedRef = useRef(false);

  // Read from localStorage using useSyncExternalStore
  const storedView = useSyncExternalStore(
    localStorageStore.subscribe,
    localStorageStore.getSnapshot,
    localStorageStore.getServerSnapshot
  );

  // Force view to be "list" if calendar view is disabled
  const view = bookingsV3Enabled ? _view : "list";

  // Sync localStorage value to URL on initial mount
  useEffect(() => {
    // Only sync if there's no URL parameter AND localStorage has a non-default value
    const urlHasViewParam =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).has("view");

    if (!urlHasViewParam && storedView !== "list" && _view !== storedView) {
      setView(storedView);
    } else {
      // No sync needed, mark as initialized
      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark as initialized when _view matches storedView after initial sync
  useEffect(() => {
    if (!isInitializedRef.current && _view === storedView) {
      isInitializedRef.current = true;
    }
  }, [_view, storedView]);

  // Sync to localStorage when view changes (only if initialized)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (bookingsV3Enabled && view && view !== storedView) {
      localStorage.setItem(STORAGE_KEY, view);
      localStorageStore.notify(); // Notify all subscribers
    }
  }, [view, storedView, bookingsV3Enabled]);

  return [view, setView] as const;
}
