/// <reference types="react" />
import type { ArrayPath, Control, FieldPath, FieldPathValue, FieldValues } from "react-hook-form";
import type { AvailabilityFormValues } from "@calcom/atoms/availability/types";
import type { TimeRange } from "@calcom/types/schedule";
export type { TimeRange };
export type ScheduleLabelsType = {
    addTime: string;
    copyTime: string;
    deleteTime: string;
};
export type FieldPathByValue<TFieldValues extends FieldValues, TValue> = {
    [Key in FieldPath<TFieldValues>]: FieldPathValue<TFieldValues, Key> extends TValue ? Key : never;
}[FieldPath<TFieldValues>];
export declare const ScheduleDay: <TFieldValues extends FieldValues>({ name, weekday, control, handleSubmit, CopyButton, disabled, labels, userTimeFormat, className, }: {
    name: ArrayPath<TFieldValues>;
    weekday: string;
    control: Control<TFieldValues, any>;
    handleSubmit?: ((data: AvailabilityFormValues) => Promise<void>) | undefined;
    CopyButton: JSX.Element;
    disabled?: boolean | undefined;
    labels?: ScheduleLabelsType | undefined;
    userTimeFormat: number | null;
    className?: {
        scheduleDay?: string | undefined;
        dayRanges?: string | undefined;
        timeRangeField?: string | undefined;
        labelAndSwitchContainer?: string | undefined;
        scheduleContainer?: string | undefined;
    } | undefined;
}) => JSX.Element;
declare const Schedule: <TFieldValues extends FieldValues, TPath extends FieldPathByValue<TFieldValues, TimeRange[][]>>(props: {
    name: TPath;
    control: Control<TFieldValues, any>;
    weekStart?: number | undefined;
    disabled?: boolean | undefined;
    handleSubmit?: ((data: AvailabilityFormValues) => Promise<void>) | undefined;
    labels?: ScheduleLabelsType | undefined;
    userTimeFormat?: number | null | undefined;
}) => JSX.Element;
export declare const ScheduleComponent: <TFieldValues extends FieldValues, TPath extends FieldPathByValue<TFieldValues, TimeRange[][]>>({ name, control, handleSubmit, disabled, weekStart, labels, userTimeFormat, className, }: {
    name: TPath;
    control: Control<TFieldValues, any>;
    handleSubmit?: ((data: AvailabilityFormValues) => Promise<void>) | undefined;
    weekStart?: number | undefined;
    disabled?: boolean | undefined;
    labels?: ScheduleLabelsType | undefined;
    userTimeFormat: number | null;
    className?: {
        schedule?: string | undefined;
        scheduleDay?: string | undefined;
        dayRanges?: string | undefined;
        timeRanges?: string | undefined;
        labelAndSwitchContainer?: string | undefined;
    } | undefined;
}) => JSX.Element;
export declare const DayRanges: <TFieldValues extends FieldValues>({ name, disabled, control, labels, userTimeFormat, className, handleSubmit, }: {
    name: ArrayPath<TFieldValues>;
    control?: Control<TFieldValues, any> | undefined;
    disabled?: boolean | undefined;
    labels?: ScheduleLabelsType | undefined;
    userTimeFormat: number | null;
    className?: {
        dayRanges?: string | undefined;
        timeRangeField?: string | undefined;
    } | undefined;
    handleSubmit?: ((data: AvailabilityFormValues) => Promise<void>) | undefined;
}) => JSX.Element | null;
export default Schedule;
//# sourceMappingURL=Schedule.d.ts.map