import { useSession } from "next-auth/react";
import { useState } from "react";
import type { PropsWithChildren } from "react";

import { Button, Switch, Tooltip } from "@calcom/ui";
import { Settings } from "@calcom/ui/components/icon";

import { useBookerStore } from "../../store";
import { OverlayCalendarContinueModal } from "../OverlayCalendar/OverlayCalendarContinueModal";
import { OverlayCalendarSettingsModal } from "../OverlayCalendar/OverlayCalendarSettingsModal";

const SUPPORTED_LAYOUTS = ["month_view"];

function TooltipWrapper({ children, text }: PropsWithChildren<{ text: string }>) {
  const layout = useBookerStore((state) => state.layout);
  if (SUPPORTED_LAYOUTS.includes(layout)) return <>{children}</>;

  return (
    <Tooltip content={text}>
      <>{children}</>
    </Tooltip>
  );
}

export function OverlayCalendarContainer() {
  const [continueWithProvider, setContinueWithProvider] = useState(false);
  const [calendarSettingsOverlay, setCalendarSettingsOverlay] = useState(false);
  const { data: session } = useSession();
  const layout = useBookerStore((state) => state.layout);

  return (
    <>
      <div className="flex gap-2">
        <div className="flex items-center gap-2 pr-2">
          <TooltipWrapper text="Only avaibable on the month view">
            <Switch
              disabled={layout !== "month_view"}
              id="overlayCalendar"
              onCheckedChange={(state) => {
                if (!session) {
                  setContinueWithProvider(state);
                }
              }}
            />
            <label
              htmlFor="overlayCalendar"
              className="text-emphasis text-sm font-medium leading-none hover:cursor-pointer">
              Overlay my calendar
            </label>
          </TooltipWrapper>
        </div>
        {session && (
          <Button
            size="base"
            variant="icon"
            color="secondary"
            StartIcon={Settings}
            onClick={() => {
              setCalendarSettingsOverlay(true);
            }}
          />
        )}
      </div>
      <OverlayCalendarContinueModal
        open={continueWithProvider}
        onClose={(val) => {
          setContinueWithProvider(val);
        }}
      />
      <OverlayCalendarSettingsModal
        open={calendarSettingsOverlay}
        onClose={(val) => {
          setCalendarSettingsOverlay(val);
        }}
      />
    </>
  );
}
