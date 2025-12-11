"use client";

import { useQueryState } from "nuqs";
import { useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { viewParser, type BookingView } from "../lib/viewParser";

export function ViewToggleButton() {
  const { t } = useLocale();
  const [view, setView] = useQueryState(
    "view",
    viewParser.withDefault("list").withOptions({ clearOnDefault: true })
  );
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    // Force list view on mobile
    if (isMobile && view === "calendar") {
      setView("list");
    }
  }, [isMobile, view, setView]);

  if (isMobile) {
    return null;
  }

  return (
    <div className="hidden sm:block">
      <ToggleGroup
        value={view}
        onValueChange={(value) => {
          if (!value) return;
          setView(value as BookingView);
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
