import { ComponentMeta } from "@storybook/react";
import { useState } from "react";

import { Dayjs } from "@calcom/dayjs";
import DatePicker from "@calcom/ui/v2/booker/DatePicker";

export default {
  title: "Datepicker",
  component: DatePicker,
} as ComponentMeta<typeof DatePicker>;

export const Default = () => {
  const [selected, setSelected] = useState<Dayjs>();
  return (
    <div style={{ width: "455px" }}>
      <DatePicker selected={selected} onChange={setSelected} locale="en" />
    </div>
  );
};
