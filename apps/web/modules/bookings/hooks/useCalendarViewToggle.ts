"use client";

import { localStorage } from "@calcom/lib/webstorage";
import { createParser, useQueryState } from "nuqs";
import { useEffect, useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "bookings-calendar-sub-view";

type CalendarSubView = "week" | "month";

const calViewParser = createParser({
  parse: (value: string): CalendarSubView => {
    if (value === "month") return "month";
    return "week";
  },
  serialize: (value: CalendarSubView) => value,
});

const createLocalStorageStore = () => {
  let listeners: Array<() => void> = [];

  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  };

  const getSnapshot = (): CalendarSubView => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "week" || stored === "month") return stored;
    return "week";
  };

  const getServerSnapshot = (): CalendarSubView => "week";

  const notify = () => listeners.forEach((l) => l());

  return { subscribe, getSnapshot, getServerSnapshot, notify };
};

const localStorageStore = createLocalStorageStore();

export function useCalendarViewToggle() {
  const [calView, setCalView] = useQueryState("calView", calViewParser.withDefault("week"));
  const isInitializedRef = useRef(false);

  const storedView = useSyncExternalStore(
    localStorageStore.subscribe,
    localStorageStore.getSnapshot,
    localStorageStore.getServerSnapshot
  );

  // Sync localStorage → URL on initial mount (when URL has no param yet)
  useEffect(() => {
    const urlHasParam =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).has("calView");
    if (!urlHasParam && storedView !== "week" && calView !== storedView) {
      setCalView(storedView);
    } else {
      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calView, setCalView, storedView]);

  useEffect(() => {
    if (!isInitializedRef.current && calView === storedView) {
      isInitializedRef.current = true;
    }
  }, [calView, storedView]);

  // Sync URL → localStorage when view changes
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (calView && calView !== storedView) {
      localStorage.setItem(STORAGE_KEY, calView);
      localStorageStore.notify();
    }
  }, [calView, storedView]);

  return [calView, setCalView] as const;
}
