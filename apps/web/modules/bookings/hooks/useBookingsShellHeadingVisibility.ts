"use client";

import { useLayoutEffect } from "react";

const MARKER_CLASS = "bookings-shell-heading";

export function useBookingsShellHeadingVisibility({ visible }: { visible: boolean }) {
  useLayoutEffect(() => {
    const marker = document.querySelector(`.${MARKER_CLASS}`);
    if (!marker) return;

    const headerWrapper = marker.closest("header")?.parentElement;
    if (!headerWrapper) return;

    if (visible) {
      headerWrapper.classList.remove("hidden");
    } else {
      headerWrapper.classList.add("hidden");
    }

    return () => {
      headerWrapper.classList.remove("hidden");
    };
  }, [visible]);
}
