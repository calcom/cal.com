"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function useNuqsParams() {
  const pathname = usePathname();
  const isBookingsPage = pathname?.startsWith("/bookings/");

  return useMemo(() => {
    if (isBookingsPage) {
      return { processUrlSearchParams: putUidFirstInQueryParams };
    }
    return {};
  }, [isBookingsPage]);
}

function putUidFirstInQueryParams(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  const entries = Array.from(params.entries());

  // Clear existing params
  entries.forEach(([key]) => params.delete(key));

  // Sort entries with "uid" first, then alphabetically
  const sortedEntries = entries.sort(([keyA], [keyB]) => {
    if (keyA === "uid") return -1;
    if (keyB === "uid") return 1;
    return keyA.localeCompare(keyB);
  });

  // Re-add sorted entries
  sortedEntries.forEach(([key, value]) => params.append(key, value));

  return params;
}
