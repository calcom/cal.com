import { useState } from "react";

import DatePicker from "@calcom/ui/v2/modules/booker/DatePicker";

export default {
  title: "Datepicker",
  component: DatePicker,
};

export const Default = () => {
  const [selected, setSelected] = useState<Date>(new Date());
  return (
    <div style={{ width: "455px" }}>
      {/* <DatePicker selected={selected} onChange={setSelected} locale="en" /> */}
    </div>
  );
};
