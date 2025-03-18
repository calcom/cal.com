"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { AppListCardProps } from "@calcom/ui/components/app-list-card/AppListCard";

export default function AppListCard(props: AppListCardProps) {
  const isPlatform = useIsPlatform();

  // Dynamically import the correct wrapper
  const AppListCardWrapper = useMemo(
    () =>
      dynamic(
        () => (isPlatform ? import("./AppListCardPlatformWrapper") : import("./AppListCardWebWrapper")),
        {
          ssr: false, // Prevents SSR issues if needed
        }
      ),
    [isPlatform]
  );

  return <AppListCardWrapper {...props} />;
}
