import dynamic from "next/dynamic";

export const DateRangePickerLazy = dynamic(
  () => import("./DateRangePicker")
) as unknown as typeof import("./DateRangePicker").default;
