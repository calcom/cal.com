import { useEffect } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Switch } from "@calcom/ui";

import { useBookerStore } from "../../store";
import { useOverlayCalendarStore } from "./store";

interface OverlayCalendarSwitchProps {
  enabled?: boolean;
  hasSession: boolean;
  onStateChange: (state: boolean) => void;
}

export function OverlayCalendarSwitch({ enabled, hasSession, onStateChange }: OverlayCalendarSwitchProps) {
  const { t } = useLocale();
  const setContinueWithProvider = useOverlayCalendarStore((state) => state.setContinueWithProviderModal);
  const setCalendarSettingsOverlay = useOverlayCalendarStore(
    (state) => state.setCalendarSettingsOverlayModal
  );
  const layout = useBookerStore((state) => state.layout);
  const switchEnabled = enabled;

  /**
   * If a user is not logged in and the overlay calendar query param is true,
   * show the continue modal so they can login / create an account
   */
  useEffect(() => {
    if (!hasSession && switchEnabled) {
      onStateChange(false);
      setContinueWithProvider(true);
    }
  }, [hasSession, switchEnabled, setContinueWithProvider, onStateChange]);

  return (
    <div
      className={classNames(
        "hidden gap-2",
        layout === "week_view" || layout === "column_view" ? "xl:flex" : "md:flex"
      )}>
      <div className="flex items-center gap-2 pr-2">
        <Switch
          data-testid="overlay-calendar-switch"
          checked={switchEnabled}
          id="overlayCalendar"
          onCheckedChange={(state) => {
            if (!hasSession) {
              setContinueWithProvider(state);
            } else {
              onStateChange(state);
            }
          }}
        />
        <label
          htmlFor="overlayCalendar"
          className="text-emphasis text-sm font-medium leading-none hover:cursor-pointer">
          {t("overlay_my_calendar")}
        </label>
      </div>
      {hasSession && (
        <Button
          size="base"
          data-testid="overlay-calendar-settings-button"
          variant="icon"
          color="secondary"
          StartIcon="settings"
          onClick={() => {
            setCalendarSettingsOverlay(true);
          }}
        />
      )}
    </div>
  );
}
