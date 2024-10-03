import { m } from "framer-motion";

import dayjs from "@calcom/dayjs";
import { useEmbedUiConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { EventMetaSkeleton } from "@calcom/features/bookings";
import { ArrowLeft } from "@calcom/ui/components/icon";

import { fadeInUp } from "../config";
import { useBookerStore } from "../store";
import type { useEventReturnType } from "../utils/event";
import { TimezoneWithLabel } from "./TimezoneWithLabel";

export const EventMetaLess = ({
  event,
  isPending,
  onGoBack,
}: {
  event: useEventReturnType["data"];
  isPending: useEventReturnType["isPending"];
  onGoBack?: () => void;
}) => {
  const embedUiConfig = useEmbedUiConfig();
  const isEmbed = useIsEmbed();
  const hideEventTypeDetails = isEmbed ? embedUiConfig.hideEventTypeDetails : false;

  const selectedDateString = useBookerStore((state) => state.selectedDate);
  const selectedDate = dayjs(selectedDateString);

  if (hideEventTypeDetails) {
    return null;
  }

  return (
    <div className="border-subtle relative z-10 border-b-2 p-4" data-testid="event-meta">
      {isPending && (
        <m.div {...fadeInUp} initial="visible" layout>
          <EventMetaSkeleton />
        </m.div>
      )}
      {!isPending && !!event && (
        <m.div {...fadeInUp} layout transition={{ ...fadeInUp.transition, delay: 0.3 }}>
          {!!onGoBack && (
            <button
              className="border-subtle absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border"
              onClick={onGoBack}>
              <ArrowLeft className="w-6" />
            </button>
          )}
          <p className="text-text mb-2 text-center text-xl font-semibold">{selectedDate.format("dddd")}</p>
          <p className="my-2 text-center">{selectedDate.format("MMMM D, YYYY")}</p>
          <div className="mt-2 flex items-center justify-center">
            <TimezoneWithLabel
              event={event}
              isPending={isPending}
              className="mt-2"
              labelClassName="text-center"
            />
          </div>
        </m.div>
      )}
    </div>
  );
};
