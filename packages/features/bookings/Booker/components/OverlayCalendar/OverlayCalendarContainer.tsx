import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";
import { Button, Switch } from "@calcom/ui";
import { Settings } from "@calcom/ui/components/icon";

import { useBookerStore } from "../../store";
import { OverlayCalendarContinueModal } from "../OverlayCalendar/OverlayCalendarContinueModal";
import { OverlayCalendarSettingsModal } from "../OverlayCalendar/OverlayCalendarSettingsModal";
import { useLocalSet } from "../hooks/useLocalSet";
import { useOverlayCalendarStore } from "./store";

const SUPPORTED_LAYOUTS = ["month_view"];

export function OverlayCalendarContainer() {
  const [continueWithProvider, setContinueWithProvider] = useState(false);
  const [calendarSettingsOverlay, setCalendarSettingsOverlay] = useState(false);
  const { data: session } = useSession();
  const layout = useBookerStore((state) => state.layout);
  const setOverlayBusyDates = useOverlayCalendarStore((state) => state.setOverlayBusyDates);
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Move this to a hook
  const { set } = useLocalSet<{
    credentialId: number;
    externalId: string;
  }>("toggledConnectedCalendars", []);
  const overlayCalendarQueryParam = searchParams.get("overlayCalendar");
  const { data: overlayBusyDates } = trpc.viewer.availability.calendarOverlay.useQuery(
    {
      loggedInUsersTz: dayjs.tz.guess() || "Europe/London",
      dateFrom: selectedDate,
      dateTo: selectedDate,
      calendarsToLoad: Array.from(set).map((item) => ({
        credentialId: item.credentialId,
        externalId: item.externalId,
      })),
    },
    { enabled: overlayCalendarQueryParam === "true" && !!session }
  );

  useEffect(() => {
    if (overlayBusyDates) {
      setOverlayBusyDates(overlayBusyDates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayBusyDates]);

  // Toggle query param for overlay calendar
  const toggleOverlayCalendarQueryParam = useCallback(
    (state: boolean) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (state) {
        current.set("overlayCalendar", "true");
      } else {
        current.delete("overlayCalendar");
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
    if (!session && overlayCalendarQueryParam === "true") {
      toggleOverlayCalendarQueryParam(false);
      setContinueWithProvider(true);
    }
  }, [session, overlayCalendarQueryParam, toggleOverlayCalendarQueryParam]);

  return (
    <>
      <div className="flex gap-2">
        <div className="flex items-center gap-2 pr-2">
          <Switch
            disabled={layout !== "week_view"}
            checked={overlayCalendarQueryParam === "true"}
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
            Overlay my calendar
          </label>
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
