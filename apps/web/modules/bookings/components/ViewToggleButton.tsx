"use client";

import { useEffect } from "react";
import { Menu, Calendar } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { ToggleGroup } from "@calcom/ui/components/form";

import { useBookingsView } from "../hooks/useBookingsView";

type ViewToggleButtonProps = {
  bookingsV3Enabled: boolean;
};

export function ViewToggleButton({ bookingsV3Enabled }: ViewToggleButtonProps) {
  const { t } = useLocale();
  const [view, setView] = useBookingsView({ bookingsV3Enabled });
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
        onValueChange={(value: "list" | "calendar") => {
          if (!value) return;
          setView(value);
        }}
        options={[
          {
            value: "list",
            label: "",
            tooltip: t("list_view"),
            iconLeft: <Menu className="h-4 w-4" />,
          },
          {
            value: "calendar",
            label: "",
            tooltip: t("calendar_view"),
            iconLeft: <Calendar className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  );
}
