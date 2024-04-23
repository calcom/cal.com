import dynamic from "next/dynamic";

export const DateRangePickerLazy = dynamic(() =>
  import("./DateRangePicker").then((mod) => mod.DatePickerWithRange)
);
