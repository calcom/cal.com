"use client";

import { EventTypesSkeletonLoader } from "@calcom/features/eventtypes/components/SkeletonLoader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";

export function EventTypesSkeleton() {
  const { t } = useLocale();
  return (
    <ShellMainAppDir heading={t("event_types_page_title")} subtitle={t("event_types_page_subtitle")}>
      <EventTypesSkeletonLoader />
    </ShellMainAppDir>
  );
}
