import { m } from "framer-motion";
import dynamic from "next/dynamic";

import { EventMetaSkeleton } from "@calcom/features/bookings";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Globe } from "@calcom/ui/components/icon";

import { fadeInUp } from "../config";
import { useBookerStore } from "../store";
import type { useEventReturnType } from "../utils/event";

const TimezoneSelect = dynamic(
  () => import("@calcom/ui/components/form/timezone-select/TimezoneSelect").then((mod) => mod.TimezoneSelect),
  {
    ssr: false,
  }
);

export const TimezoneWithLabel = ({
  event,
  isPending,
  className,
  labelClassName,
}: {
  event: useEventReturnType["data"];
  isPending: useEventReturnType["isPending"];
  className?: string;
  labelClassName?: string;
}) => {
  const { setTimezone, timezone } = useTimePreferences();
  const bookerState = useBookerStore((state) => state.state);
  const { t } = useLocale();

  return (
    <div className={classNames("flex flex-col", className)}>
      {!isPending && (
        <div className={classNames("text-default mb-2 text-sm", labelClassName)}>{t("timezone")}</div>
      )}
      <div className="relative z-10">
        {isPending && (
          <m.div {...fadeInUp} initial="visible" layout>
            <EventMetaSkeleton />
          </m.div>
        )}
        {!isPending && !!event && (
          <EventMetaBlock
            className="cursor-pointer [&_.current-timezone:before]:focus-within:opacity-100 [&_.current-timezone:before]:hover:opacity-100"
            contentClassName="relative max-w-[90%]"
            icon={Globe}>
            {bookerState === "booking" ? (
              <>{timezone}</>
            ) : (
              <span
                className={`min-w-32 current-timezone before:bg-subtle -mt-[2px] flex h-6 max-w-full items-center justify-start before:absolute before:inset-0 before:bottom-[-3px] before:left-[-30px] before:top-[-3px] before:w-[calc(100%_+_35px)] before:rounded-md before:py-3 before:opacity-0 before:transition-opacity ${
                  event.lockTimeZoneToggleOnBookingPage ? "cursor-not-allowed" : ""
                }`}>
                <TimezoneSelect
                  menuPosition="fixed"
                  classNames={{
                    control: () => "!min-h-0 p-0 w-full border-0 bg-transparent focus-within:ring-0",
                    menu: () => "!w-64 max-w-[90vw]",
                    singleValue: () => "text-text py-1",
                    indicatorsContainer: () => "ml-auto",
                    container: () => "max-w-full",
                  }}
                  value={timezone}
                  onChange={(tz) => setTimezone(tz.value)}
                  isDisabled={event.lockTimeZoneToggleOnBookingPage}
                />
              </span>
            )}
          </EventMetaBlock>
        )}
      </div>
    </div>
  );
};
