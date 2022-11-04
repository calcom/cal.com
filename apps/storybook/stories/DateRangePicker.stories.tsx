import { ComponentMeta, ComponentStory } from "@storybook/react";
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import { useState } from "react";

import DateRangePicker from "@calcom/ui/v2/core/form/date-range-picker/DateRangePicker";
import "@calcom/ui/v2/core/form/date-range-picker/styles.css";

function getISOLocalDate(date) {
  const year = padStart(date.getFullYear(), 4);
  const month = padStart(date.getMonth() + 1);
  const day = padStart(date.getDate());

  return [`${year}-${month}-${day}`];
}

function padStart(num, val = 2) {
  const numStr = `${num}`;
  if (numStr.length >= val) {
    return num;
  }

  return `0000${numStr}`.slice(-val);
}

export default {
  title: "Date Range Picker",
  component: DateRangePicker,
} as ComponentMeta<typeof DateRangePicker>;

export const Default: ComponentStory<typeof DateRangePicker> = () => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  return (
    <div>
      <DateRangePicker
        startDate={getISOLocalDate(startDate) as unknown as Date}
        endDate={getISOLocalDate(endDate) as unknown as Date}
        onDatesChange={({ startDate, endDate }) => {
          setStartDate(startDate);
          setEndDate(endDate);
        }}
      />
    </div>
  );
};
