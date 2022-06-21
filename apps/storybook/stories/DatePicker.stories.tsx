import { useState } from "react";

import DatePicker from "@calcom/ui/booker/DatePicker";

export default {
  title: "Datepicker",
  component: DatePicker,
};

export const Default = () => {
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  return (
    <div style={{ width: "455px" }}>
      <DatePicker selected={selected} onChange={setSelected} locale="en"></DatePicker>
    </div>
  );
};
