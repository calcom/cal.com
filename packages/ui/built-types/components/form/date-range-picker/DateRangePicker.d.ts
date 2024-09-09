import * as React from "react";
type DatePickerWithRangeProps = {
    dates: {
        startDate: Date;
        endDate?: Date;
    };
    onDatesChange: ({ startDate, endDate }: {
        startDate?: Date;
        endDate?: Date;
    }) => void;
    disabled?: boolean;
};
export declare function DatePickerWithRange({ className, dates, onDatesChange, disabled, }: React.HTMLAttributes<HTMLDivElement> & DatePickerWithRangeProps): JSX.Element;
export {};
//# sourceMappingURL=DateRangePicker.d.ts.map