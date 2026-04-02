"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EventTypesSkeletonLoader } from "@calcom/web/modules/event-types/components/SkeletonLoader";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";

export function EventTypesSkeleton() {
  const { t } = useLocale();
  return (
    <ShellMainAppDir heading={t("event_types_page_title")} subtitle={t("event_types_page_subtitle")}>
      <EventTypesSkeletonLoader />
    </ShellMainAppDir>
  );
}
