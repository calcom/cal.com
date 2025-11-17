"use client";

import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";

import { activeFiltersParser } from "@calcom/features/data-table/lib/parsers";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { viewParser, type BookingView } from "~/bookings/lib/viewParser";

export function ViewToggleButton() {
  const { t } = useLocale();
  const [view, setView] = useQueryState(
    "view",
    viewParser.withDefault("list").withOptions({ clearOnDefault: true })
  );
  const [, setActiveFilters] = useQueryState("activeFilters", activeFiltersParser);
  const isMobile = !useMediaQuery("(min-width: 640px)");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Force list view on mobile, but only after the component has mounted
    // and the media query has had a chance to properly evaluate
    if (isMounted && isMobile && view !== "list") {
      setView("list");
    }
  }, [isMounted, isMobile, view, setView]);

  return (
    <div className="hidden sm:block">
      <ToggleGroup
        value={view}
        onValueChange={(value) => {
          if (!value) return;
          const newView = value as BookingView;

          // When switching from calendar to list view, remove the dateRange filter
          if (view === "calendar" && newView === "list") {
            setActiveFilters((prev) => prev?.filter((filter) => filter.f !== "dateRange") ?? []);
          }

          setView(newView);
        }}
        options={[
          {
            value: "list",
            label: "",
            tooltip: t("list_view"),
            iconLeft: <Icon name="menu" className="h-4 w-4" />,
          },
          {
            value: "calendar",
            label: "",
            tooltip: t("calendar_view"),
            iconLeft: <Icon name="calendar" className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  );
}
