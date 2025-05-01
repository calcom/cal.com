import dayjs from "@calcom/dayjs";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";

import { useCalendarStore } from "../../state/store";

export function SchedulerHeading() {
  const { startDate, endDate, handleDateChange } = useCalendarStore((state) => ({
    startDate: dayjs(state.startDate),
    endDate: dayjs(state.endDate),
    handleDateChange: state.handleDateChange,
  }));

  return (
    <header className="flex flex-none flex-col justify-between py-4 sm:flex-row sm:items-center">
      <h1 className="text-emphasis text-xl font-semibold">
        {startDate.format("MMM DD")}-{endDate.format("DD")}
        <span className="text-subtle">,{startDate.format("YYYY")}</span>
      </h1>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        {/* TODO: Renable when we have daily/mobile support */}
        {/* <ToggleGroup
          options={[
            { label: "Daily", value: "day", disabled: false },
            { label: "Weekly", value: "week", disabled: isSm },
          ]}
          defaultValue={view === "day" ? "day" : "week"}
        /> */}

        <ButtonGroup combined>
          {/* TODO: i18n label with correct view */}
          <Button
            StartIcon="chevron-left"
            variant="icon"
            color="secondary"
            aria-label="Previous Week"
            onClick={() => {
              handleDateChange("DECREMENT");
            }}
          />
          <Button
            StartIcon="chevron-right"
            variant="icon"
            color="secondary"
            aria-label="Next Week"
            onClick={() => {
              handleDateChange("INCREMENT");
            }}
          />
        </ButtonGroup>
      </div>
    </header>
  );
}
