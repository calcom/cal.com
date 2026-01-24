import dynamic from "next/dynamic";
import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import { Timezone as PlatformTimezoneSelect } from "@calcom/atoms/timezone";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { Timezone } from "@calcom/features/bookings/Booker/types";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { EventDetailBlocks } from "@calcom/features/bookings/types";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

import { EventDetails } from "./event-meta/Details";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const LoadingState = () => {
  const { t } = useLocale();
  return <span className="text-default text-sm">{t("loading")}</span>;
};

const WebTimezoneSelect = dynamic(
  () =>
    import("@calcom/features/components/timezone-select").then(
      (mod) => mod.TimezoneSelect
    ),
  {
    ssr: false,
    loading: () => <LoadingState />,
  }
);

type SlotSelectionModalHeaderProps = {
  onClick: () => void;
  event?: Pick<
    BookerEvent,
    | "length"
    | "metadata"
    | "lockTimeZoneToggleOnBookingPage"
    | "lockedTimeZone"
    | "isDynamic"
    | "currency"
    | "price"
    | "locations"
    | "requiresConfirmation"
    | "recurringEvent"
    | "enablePerHostLocations"
  > | null;
  isPlatform?: boolean;
  timeZones?: Timezone[];
  selectedDate: string | null;
};

export const SlotSelectionModalHeader = ({
  onClick,
  event,
  isPlatform = false,
  timeZones,
  selectedDate,
}: SlotSelectionModalHeaderProps) => {
  const { i18n } = useLocale();
  const [setTimezone] = useTimePreferences((state) => [state.setTimezone]);
  const [timezone, setBookerStoreTimezone] = useBookerStoreContext(
    (state) => [state.timezone, state.setTimezone],
    shallow
  );
  const [TimezoneSelect] = useMemo(
    () => (isPlatform ? [PlatformTimezoneSelect] : [WebTimezoneSelect]),
    [isPlatform]
  );

  const formattedDate = useMemo(() => {
    if (!selectedDate) return { dayOfWeek: "", fullDate: "" };
    const date = new Date(selectedDate);
    const dayOfWeek = date.toLocaleDateString(i18n.language, {
      weekday: "long",
    });
    const fullDate = date.toLocaleDateString(i18n.language, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return { dayOfWeek, fullDate };
  }, [selectedDate, i18n.language]);

  return (
    <div className="two-step-slot-selection-modal-header bg-default border-subtle sticky top-0 z-10 flex flex-col mb-4 mt-0 border-b pb-4 -mx-4 px-8">
      <div className="flex flex-col gap-2 pt-8">
        <div className="flex flex-col">
          <span className="text-emphasis text-lg font-semibold">
            <Button
              color="minimal"
              StartIcon="arrow-left"
              className="mb-2 ml-[-42px] w-[40px]"
              onClick={onClick}
            />{" "}
            {formattedDate.dayOfWeek}
          </span>
          <span className="text-default text-sm">{formattedDate.fullDate}</span>
        </div>

        {event && (
          <EventDetails event={event} blocks={[EventDetailBlocks.DURATION]} />
        )}

        <div className="text-default flex items-center gap-2 text-sm mb-0">
          <Icon name="globe" className="text-subtle h-4 w-4 shrink-0" />
          {TimezoneSelect && (
            <span className="min-w-32 -mt-[2px] flex h-6 max-w-full items-center justify-start">
              <TimezoneSelect
                timeZones={timeZones}
                menuPosition="fixed"
                classNames={{
                  control: () =>
                    "min-h-0! p-0 w-full border-0 bg-transparent focus-within:ring-0 shadow-none!",
                  menu: () => "w-64! max-w-[90vw] mb-1",
                  singleValue: () => "text-text py-1",
                  indicatorsContainer: () => "ml-auto",
                  container: () => "max-w-full",
                }}
                value={
                  event?.lockTimeZoneToggleOnBookingPage
                    ? event.lockedTimeZone || CURRENT_TIMEZONE
                    : timezone || CURRENT_TIMEZONE
                }
                onChange={({ value }) => {
                  setTimezone(value);
                  setBookerStoreTimezone(value);
                }}
                isDisabled={event?.lockTimeZoneToggleOnBookingPage}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
