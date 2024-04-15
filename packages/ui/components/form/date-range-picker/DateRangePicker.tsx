// @see: https://github.com/wojtekmaj/react-daterange-picker/issues/91
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import PrimitiveDateRangePicker from "@wojtekmaj/react-daterange-picker/dist/entry.nostyle";

import { Icon } from "../../..";
import "./styles.css";

type Props = {
  disabled?: boolean | undefined;
  startDate: Date;
  endDate: Date;
  onDatesChange?: ((arg: { startDate: Date; endDate: Date }) => void) | undefined;
};

const DateRangePicker = ({ disabled, startDate, endDate, onDatesChange }: Props) => {
  return (
    <>
      <PrimitiveDateRangePicker
        disabled={disabled || false}
        className="border-default rounded-sm text-sm"
        clearIcon={null}
        calendarIcon={<Icon name="calendar" className="text-subtle h-4 w-4" />}
        rangeDivider={<Icon name="arrow-right" className="text-muted h-4 w-4 ltr:mr-2 rtl:ml-2" />}
        value={[startDate, endDate]}
        onChange={([startDate, endDate]: [Date, Date]) => {
          if (typeof onDatesChange === "function") onDatesChange({ startDate, endDate });
        }}
        nextLabel={<Icon name="chevron-right" className="text-subtle h-4 w-4" />}
        prevLabel={<Icon name="chevron-left" className="text-subtle h-4 w-4" />}
      />
    </>
  );
};

export default DateRangePicker;
