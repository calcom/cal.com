// @see: https://github.com/wojtekmaj/react-daterange-picker/issues/91
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import PrimitiveDateRangePicker from "@wojtekmaj/react-daterange-picker/dist/entry.nostyle";

import { FiArrowRight, FiCalendar, FiChevronLeft, FiChevronRight } from "../../icon";
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
        calendarIcon={<FiCalendar className="text-subtle h-4 w-4" />}
        rangeDivider={<FiArrowRight className="text-muted h-4 w-4 ltr:mr-2 rtl:ml-2" />}
        value={[startDate, endDate]}
        onChange={([startDate, endDate]: [Date, Date]) => {
          if (typeof onDatesChange === "function") onDatesChange({ startDate, endDate });
        }}
        nextLabel={<FiChevronRight className="text-subtle h-4 w-4" />}
        prevLabel={<FiChevronLeft className="text-subtle h-4 w-4" />}
      />
    </>
  );
};

export default DateRangePicker;
