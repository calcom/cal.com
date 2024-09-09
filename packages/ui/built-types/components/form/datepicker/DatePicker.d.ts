/// <reference types="react" />
import "react-calendar/dist/Calendar.css";
import "react-date-picker/dist/DatePicker.css";
type Props = {
    date: Date;
    onDatesChange?: ((date: Date) => void) | undefined;
    className?: string;
    disabled?: boolean;
    minDate?: Date;
};
declare const DatePicker: ({ minDate, disabled, date, onDatesChange, className }: Props) => JSX.Element;
export default DatePicker;
//# sourceMappingURL=DatePicker.d.ts.map