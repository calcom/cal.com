declare module "@wojtekmaj/react-daterange-picker/dist/entry.nostyle" {
  import { CalendarProps } from "react-calendar";
  export type DateRangePickerCalendarProps = Omit<
    CalendarProps,
    "calendarClassName" | "onChange" | "value"
  > & {
    calendarClassName?: string;
    onChange: (value: [Date, Date]) => void;
    value: [Date, Date];
    clearIcon: JSX.Element | null;
    calendarIcon: JSX.Element | null;
    rangeDivider: JSX.Element | null;
  };
  export default function DateRangePicker(props: DateRangePickerCalendarProps): JSX.Element;
}
