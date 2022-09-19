import { ComponentMeta } from "@storybook/react";
import { useState } from "react";

import type { Dayjs } from "@calcom/dayjs";
import DatePicker from "@calcom/ui/v2/modules/booker/DatePicker";

export default {
  title: "Datepicker",
  component: DatePicker,
  argTypes: {
    isMulti: {
      control: "boolean",
    },
  },
} as ComponentMeta<typeof DatePicker>;

export const Default = ({ ...args }) => {
  const [selected, setSelected] = useState<Dayjs>();
  return (
    <div style={{ width: "455px" }}>
      <DatePicker selected={selected} onChange={setSelected} locale="en" />
    </div>
  );
};
