// @see: https://github.com/wojtekmaj/react-daterange-picker/issues/91
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import PrimitiveDateRangePicker from "@wojtekmaj/react-daterange-picker/dist/entry.nostyle";

import { FiArrowRight, FiCalendar, FiChevronLeft, FiChevronRight } from "@calcom/ui/components/icon";

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
        className="rounded-sm border-gray-300 text-sm"
        clearIcon={null}
        calendarIcon={<FiCalendar className="h-4 w-4 text-gray-500" />}
        rangeDivider={<FiArrowRight className="h-4 w-4 text-gray-400 ltr:mr-2 rtl:ml-2" />}
        value={[startDate, endDate]}
        onChange={([startDate, endDate]: [Date, Date]) => {
          if (typeof onDatesChange === "function") onDatesChange({ startDate, endDate });
        }}
        nextLabel={<FiChevronRight className="h-4 w-4 text-gray-500" />}
        prevLabel={<FiChevronLeft className="h-4 w-4 text-gray-500" />}
      />
    </>
  );
};

export default DateRangePicker;
