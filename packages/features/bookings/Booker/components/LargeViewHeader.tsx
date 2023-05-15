import { ChevronLeft, ChevronRight } from "lucide-react";

import dayjs from "@calcom/dayjs";
import { Button, ButtonGroup } from "@calcom/ui";

import { useBookerStore } from "../store";

export function LargeViewHeader({ extraDays }: { extraDays: number }) {
  const layout = useBookerStore((state) => state.layout);
  const selectedDateString = useBookerStore((state) => state.selectedDate);
  const addToSelectedDate = useBookerStore((state) => state.addToSelectedDate);
  const isLargeTimeslots = layout === "large_timeslots";
  const selectedDate = dayjs(selectedDateString);

  if (!isLargeTimeslots) return null;

  return (
    <div className="mt-8 mb-4 flex py-2.5">
      <h3 className="text-base font-semibold leading-4">
        {selectedDate.format("MMM D")}-{selectedDate.add(extraDays, "days").format("D")},{" "}
        <span className="text-subtle">{selectedDate.format("YYYY")}</span>
      </h3>
      <div className="ml-auto">
        <ButtonGroup>
          <Button
            variant="icon"
            color="minimal"
            StartIcon={ChevronLeft}
            aria-label="Previous Day"
            onClick={() => addToSelectedDate(-extraDays - 1)}
          />
          <Button
            variant="icon"
            color="minimal"
            StartIcon={ChevronRight}
            aria-label="Next Day"
            onClick={() => addToSelectedDate(extraDays + 1)}
          />
        </ButtonGroup>
      </div>
    </div>
  );
}
