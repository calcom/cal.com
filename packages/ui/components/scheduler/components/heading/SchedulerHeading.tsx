import dayjs from "@calcom/dayjs";
import useResponsive from "@calcom/lib/hooks/useResponsive";

import { Icon } from "../../../../Icon";
import { ToggleGroup } from "../../../../v2/core/form/ToggleGroup";
import { Button } from "../../../button";
import { ButtonGroup } from "../../../buttonGroup";
import { useSchedulerStore } from "../../state/store";

export function SchedulerHeading() {
  const { isSm } = useResponsive();
  const { startDate, endDate, handleDateChange, view } = useSchedulerStore((state) => ({
    view: state.view,
    startDate: dayjs(state.startDate),
    endDate: dayjs(state.endDate),
    handleDateChange: state.handleDateChange,
  }));

  return (
    <header className="flex flex-none flex-col justify-between py-4 sm:flex-row sm:items-center">
      <h1 className="text-xl font-semibold text-gray-900">
        {startDate.format("MMM DD")}-{endDate.format("DD")}
        <span className="text-gray-500">,{startDate.format("YYYY")}</span>
      </h1>
      <div className="flex items-center space-x-2">
        <ToggleGroup
          options={[
            { label: "Daily", value: "day", disabled: false },
            { label: "Weekly", value: "week", disabled: isSm },
          ]}
          defaultValue={view === "day" ? "day" : "week"}
        />

        <ButtonGroup combined>
          {/* TODO: i18n label with correct view */}
          <Button
            StartIcon={Icon.FiChevronLeft}
            size="icon"
            color="secondary"
            aria-label="Previous Week"
            onClick={() => {
              handleDateChange("DECREMENT");
            }}
          />
          <Button
            StartIcon={Icon.FiChevronRight}
            size="icon"
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
