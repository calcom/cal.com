import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { Button, Switch } from "@calcom/ui";
import { Settings } from "@calcom/ui/components/icon";

import { useBookerStore } from "../../store";
import { useOverlayCalendarStore } from "./store";

interface OverlayCalendarSwitchProps {
  enabled?: boolean;
}

export function OverlayCalendarSwitch({ enabled }: OverlayCalendarSwitchProps) {
  const { t } = useLocale();
  const setContinueWithProvider = useOverlayCalendarStore((state) => state.setContinueWithProviderModal);
  const setCalendarSettingsOverlay = useOverlayCalendarStore(
    (state) => state.setCalendarSettingsOverlayModal
  );
  const layout = useBookerStore((state) => state.layout);
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const switchEnabled = enabled;

  // Toggle query param for overlay calendar
  const toggleOverlayCalendarQueryParam = useCallback(
    (state: boolean) => {
      const current = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
      if (state) {
        current.set("overlayCalendar", "true");
        localStorage.setItem("overlayCalendarSwitchDefault", "true");
      } else {
        current.delete("overlayCalendar");
        localStorage.removeItem("overlayCalendarSwitchDefault");
      }
      // cast to string
      const value = current.toString();
      const query = value ? `?${value}` : "";
      router.push(`${pathname}${query}`);
    },
    [searchParams, pathname, router]
  );

  /**
   * If a user is not logged in and the overlay calendar query param is true,
   * show the continue modal so they can login / create an account
   */
  useEffect(() => {
    if (!session && switchEnabled) {
      toggleOverlayCalendarQueryParam(false);
      setContinueWithProvider(true);
    }
  }, [session, switchEnabled, setContinueWithProvider, toggleOverlayCalendarQueryParam]);

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
            if (!session) {
              setContinueWithProvider(state);
            } else {
              toggleOverlayCalendarQueryParam(state);
            }
          }}
        />
        <label
          htmlFor="overlayCalendar"
          className="text-emphasis text-sm font-medium leading-none hover:cursor-pointer">
          {t("overlay_my_calendar")}
        </label>
      </div>
      {session && (
        <Button
          size="base"
          data-testid="overlay-calendar-settings-button"
          variant="icon"
          color="secondary"
          StartIcon={Settings}
          onClick={() => {
            setCalendarSettingsOverlay(true);
          }}
        />
      )}
    </div>
  );
}
