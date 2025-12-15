"use client";

import { useLayoutEffect } from "react";

const MARKER_CLASS = "bookings-shell-heading";
const HIDDEN_DATA_ATTR = "data-bookings-shell-heading-hidden";

/**
 * Hook to control the visibility of the bookings page shell heading.
 * This is needed because the heading/subtitle are rendered in the server component (page.tsx)
 * but we only want to show them in list view, not calendar view.
 *
 * @param visible - Whether the heading should be visible
 */
export function useBookingsShellHeadingVisibility({ visible }: { visible: boolean }) {
  useLayoutEffect(() => {
    const marker = document.querySelector(`.${MARKER_CLASS}`);
    if (!marker) return;

    const headerWrapper = marker.closest("header")?.parentElement;
    if (!headerWrapper) return;

    if (!visible) {
      if (headerWrapper.getAttribute(HIDDEN_DATA_ATTR) !== "true") {
        headerWrapper.classList.add("hidden");
        headerWrapper.setAttribute(HIDDEN_DATA_ATTR, "true");
      }
    } else {
      if (headerWrapper.getAttribute(HIDDEN_DATA_ATTR) === "true") {
        headerWrapper.classList.remove("hidden");
        headerWrapper.removeAttribute(HIDDEN_DATA_ATTR);
      }
    }

    return () => {
      if (headerWrapper.getAttribute(HIDDEN_DATA_ATTR) === "true") {
        headerWrapper.classList.remove("hidden");
        headerWrapper.removeAttribute(HIDDEN_DATA_ATTR);
      }
    };
  }, [visible]);
}
