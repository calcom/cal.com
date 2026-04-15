"use client";

import { localStorage } from "@calcom/lib/webstorage";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback } from "react";

const STORAGE_KEY = "bookings-calendar-sub-view";
const CAL_VIEWS = ["week", "month"] as const;
type CalendarSubView = (typeof CAL_VIEWS)[number];

// Stable parser instance — must live outside the component so nuqs gets the same
// object reference on every render. Creating it inside the component would cause
// nuqs to treat each render as a new parser and reset state, causing infinite loops.
const calViewParser = parseAsStringLiteral(CAL_VIEWS).withDefault("week");

function getStoredView(): CalendarSubView {
  try {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "month") return "month";
  } catch {
    // localStorage unavailable (e.g. private browsing)
  }
  return "week";
}

export function useCalendarViewToggle() {
  const [calView, setCalView] = useQueryState("calView", calViewParser);

  const handleSetCalView = useCallback(
    (value: CalendarSubView) => {
      setCalView(value);
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // ignore write failures
      }
    },
    [setCalView]
  );

  // On first use, if there's no URL param yet, restore the saved preference.
  // This is done inline (not in a useEffect) to avoid a flash of the wrong view.
  const effectiveView = calView ?? getStoredView();

  return [effectiveView, handleSetCalView] as const;
}
