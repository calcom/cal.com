import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { Input } from "@calcom/ui";

import { PublicEvent } from "../../types";

export const EventOccurences = ({ event }: { event: PublicEvent }) => {
  const { t } = useLocale();
  const [setRecurringEventCount, recurringEventCount] = useBookerStore((state) => [
    state.setRecurringEventCount,
    state.recurringEventCount,
  ]);

  if (!event.recurringEvent) return null;

  return (
    <>
      {getRecurringFreq({ t, recurringEvent: event.recurringEvent })}
      <Input
        className="mr-3 mt-1 inline-flex w-[60px]"
        type="number"
        defaultValue={event.recurringEvent.count}
        onChange={(event) => {
          setRecurringEventCount(parseInt(event?.target.value));
        }}
      />
      {t("occurrence", {
        count: recurringEventCount || event.recurringEvent.count,
      })}
    </>
  );
};
