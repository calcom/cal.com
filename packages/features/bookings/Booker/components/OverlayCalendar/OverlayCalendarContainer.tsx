import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import { Button, Switch } from "@calcom/ui";
import { Settings } from "@calcom/ui/components/icon";

import { useBookerStore } from "../../store";
import { OverlayCalendarContinueModal } from "../OverlayCalendar/OverlayCalendarContinueModal";
import { OverlayCalendarSettingsModal } from "../OverlayCalendar/OverlayCalendarSettingsModal";
import { useLocalSet } from "../hooks/useLocalSet";
import { useOverlayCalendarStore } from "./store";

interface OverlayCalendarSwitchProps {
  enabled?: boolean;
}

function OverlayCalendarSwitch({ enabled }: OverlayCalendarSwitchProps) {
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

export function OverlayCalendarContainer() {
  const isEmbed = useIsEmbed();
  const searchParams = useSearchParams();
  const [continueWithProvider, setContinueWithProvider] = useOverlayCalendarStore(
    (state) => [state.continueWithProviderModal, state.setContinueWithProviderModal],
    shallow
  );
  const [calendarSettingsOverlay, setCalendarSettingsOverlay] = useOverlayCalendarStore(
    (state) => [state.calendarSettingsOverlayModal, state.setCalendarSettingsOverlayModal],
    shallow
  );

  const { data: session, status: sessionStatus } = useSession();
  const setOverlayBusyDates = useOverlayCalendarStore((state) => state.setOverlayBusyDates);
  const switchEnabled =
    searchParams?.get("overlayCalendar") === "true" ||
    localStorage.getItem("overlayCalendarSwitchDefault") === "true";

  const selectedDate = useBookerStore((state) => state.selectedDate);
  const { timezone } = useTimePreferences();

  // Move this to a hook
  const { set, clearSet } = useLocalSet<{
    credentialId: number;
    externalId: string;
  }>("toggledConnectedCalendars", []);

  const { data: overlayBusyDates } = trpc.viewer.availability.calendarOverlay.useQuery(
    {
      loggedInUsersTz: timezone || "Europe/London",
      dateFrom: selectedDate,
      dateTo: selectedDate,
      calendarsToLoad: Array.from(set).map((item) => ({
        credentialId: item.credentialId,
        externalId: item.externalId,
      })),
    },
    {
      enabled: !!session && set.size > 0 && switchEnabled,
      onError: () => {
        clearSet();
      },
    }
  );

  useEffect(() => {
    if (overlayBusyDates) {
      const nowDate = dayjs();
      const usersTimezoneDate = nowDate.tz(timezone);

      const offset = (usersTimezoneDate.utcOffset() - nowDate.utcOffset()) / 60;

      const offsettedArray = overlayBusyDates.map((item) => {
        return {
          ...item,
          start: dayjs(item.start).add(offset, "hours").toDate(),
          end: dayjs(item.end).add(offset, "hours").toDate(),
        };
      });
      setOverlayBusyDates(offsettedArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayBusyDates]);

  if (isEmbed) {
    return null;
  }

  return (
    <>
      <OverlayCalendarSwitch enabled={switchEnabled} />
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
