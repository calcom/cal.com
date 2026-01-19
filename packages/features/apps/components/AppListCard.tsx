"use client";

import type { ComponentType, JSX } from "react";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { AppListCardProps } from "@calcom/ui/components/app-list-card";

export default function AppListCard(props: AppListCardProps): JSX.Element {
  const isPlatform = useIsPlatform();

  const AppListCardWrapper: ComponentType<AppListCardProps> = useMemo(() => {
    if (isPlatform) {
      return dynamic(() => import("./AppListCardPlatformWrapper"), { ssr: false });
    }
    return dynamic(() => import("./AppListCardWebWrapper"), { ssr: false });
  }, [isPlatform]);

  return <AppListCardWrapper {...props} />;
}
