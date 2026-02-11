import { Timezone as PlatformTimezoneSelect } from "@calcom/atoms/timezone";
import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { Timezone } from "@calcom/features/bookings/Booker/types";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { EventDetailBlocks } from "@calcom/features/bookings/types";
import type { TimezoneSelectComponentProps } from "@calcom/features/timezone/components/TimezoneSelectComponent";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { shallow } from "zustand/shallow";
import { EventDetails } from "./event-meta/Details";

const LoadingState = (): JSX.Element => {
  const { t } = useLocale();
  return <span className="text-default text-sm">{t("loading")}</span>;
};

type TimezoneSelectProps = Omit<
  TimezoneSelectComponentProps,
  "data" | "isPending" | "isWebTimezoneSelect"
> & {
  timeZones?: Timezone[];
};

const WebTimezoneSelect: ComponentType<TimezoneSelectProps> = dynamic(
  () => import("@calcom/web/modules/timezone/components/TimezoneSelect").then((mod) => mod.TimezoneSelect),
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
}: SlotSelectionModalHeaderProps): JSX.Element => {
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

    const date = dayjs(selectedDate);
    const dayOfWeek = date.locale(i18n.language).format("dddd");
    const fullDate = date.locale(i18n.language).format("MMMM D, YYYY");

    return { dayOfWeek, fullDate };
  }, [selectedDate, i18n.language]);

  return (
    <div className="two-step-slot-selection-modal-header sticky top-0 z-10 -mx-4 mt-0 mb-4 flex flex-col border-subtle border-b bg-default px-8 pb-4">
      <div className="flex flex-col gap-2 pt-8">
        <div className="flex flex-col">
          <span className="font-semibold text-emphasis text-lg">
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

        {event && <EventDetails event={event} blocks={[EventDetailBlocks.DURATION]} />}

        <div className="mb-0 flex items-center gap-2 text-default text-sm">
          <Icon name="globe" className="h-4 w-4 shrink-0 text-subtle" />
          {TimezoneSelect && (
            <span className="-mt-[2px] flex h-6 min-w-32 max-w-full items-center justify-start">
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
