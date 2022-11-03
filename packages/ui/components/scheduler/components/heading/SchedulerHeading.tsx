import React from "react";

import dayjs from "@calcom/dayjs";

import { Icon } from "../../../../Icon";
import { Button } from "../../../button";
import { ButtonGroup } from "../../../buttonGroup";
import { useSchedulerStore } from "../../state/store";

export function SchedulerHeading() {
  const { startDate, endDate, handleDateChange } = useSchedulerStore((state) => ({
    startDate: dayjs(state.startDate),
    endDate: dayjs(state.endDate),
    handleDateChange: state.handleDateChange,
  }));
  return (
    <header className="flex flex-none items-center justify-between border-b border-gray-200 py-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {startDate.format("MMM DD")}-{endDate.format("DD")}
        <span className="text-gray-500">,{startDate.format("YYYY")}</span>
      </h1>
      <div className="flex items-center">
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
