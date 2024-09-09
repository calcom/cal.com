/// <reference types="react" />
export declare const DateRangePickerLazy: import("react").ComponentType<import("react").HTMLAttributes<HTMLDivElement> & {
    dates: {
        startDate: Date;
        endDate?: Date | undefined;
    };
    onDatesChange: ({ startDate, endDate }: {
        startDate?: Date | undefined;
        endDate?: Date | undefined;
    }) => void;
    disabled?: boolean | undefined;
}>;
//# sourceMappingURL=index.d.ts.map