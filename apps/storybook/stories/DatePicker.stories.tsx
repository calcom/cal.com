import { ComponentMeta } from "@storybook/react";
import { useState } from "react";

import { Dayjs } from "@calcom/dayjs";
import DatePicker from "@calcom/ui/booker/DatePicker";

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
  const [selected, setSelected] = useState<Dayjs | readonly Dayjs[]>();
  console.log(selected);
  return (
    <div style={{ width: "455px" }}>
      <DatePicker
        isMulti={args.isMulti}
        weekStart={0}
        selected={selected}
        onChange={setSelected}
        locale="en"
      />
    </div>
  );
};
