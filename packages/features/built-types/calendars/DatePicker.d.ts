/// <reference types="react" />
import type { IFromUser, IToUser } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
export type DatePickerProps = {
    /** which day of the week to render the calendar. Usually Sunday (=0) or Monday (=1) - default: Sunday */
    weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    /** Fires whenever a selected date is changed. */
    onChange: (date: Dayjs | null) => void;
    /** Fires when the month is changed. */
    onMonthChange?: (date: Dayjs) => void;
    /** which date or dates are currently selected (not tracked from here) */
    selected?: Dayjs | Dayjs[] | null;
    /** defaults to current date. */
    minDate?: Date;
    /** Furthest date selectable in the future, default = UNLIMITED */
    maxDate?: Date;
    /** locale, any IETF language tag, e.g. "hu-HU" - defaults to Browser settings */
    locale: string;
    /** Defaults to [], which dates are not bookable. Array of valid dates like: ["2022-04-23", "2022-04-24"] */
    excludedDates?: string[];
    /** defaults to all, which dates are bookable (inverse of excludedDates) */
    includedDates?: string[];
    /** allows adding classes to the container */
    className?: string;
    /** Shows a small loading spinner next to the month name */
    isPending?: boolean;
    /** used to query the multiple selected dates */
    eventSlug?: string;
    /** To identify days that are not available and should display OOO and redirect if toUser exists */
    slots?: Record<string, {
        time: string;
        userIds?: number[];
        away?: boolean;
        fromUser?: IFromUser;
        toUser?: IToUser;
        reason?: string;
        emoji?: string;
    }[]>;
};
export declare const Day: ({ date, active, disabled, away, emoji, customClassName, ...props }: import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
    active: boolean;
    date: Dayjs;
    away?: boolean | undefined;
    emoji?: string | null | undefined;
    customClassName?: {
        dayContainer?: string | undefined;
        dayActive?: string | undefined;
    } | undefined;
}) => JSX.Element;
declare const Days: ({ minDate, excludedDates, browsingDate, weekStart, DayComponent, selected, month, nextMonthButton, eventSlug, slots, customClassName, isBookingInPast, ...props }: Omit<DatePickerProps, "locale" | "weekStart" | "className"> & {
    DayComponent?: import("react").FC<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
        active: boolean;
        date: Dayjs;
        away?: boolean | undefined;
        emoji?: string | null | undefined;
        customClassName?: {
            dayContainer?: string | undefined;
            dayActive?: string | undefined;
        } | undefined;
    }> | undefined;
    browsingDate: Dayjs;
    weekStart: number;
    month: string | null;
    nextMonthButton: () => void;
    customClassName?: {
        datePickerDate?: string | undefined;
        datePickerDateActive?: string | undefined;
    } | undefined;
    scrollToTimeSlots?: (() => void) | undefined;
    isBookingInPast: boolean;
}) => JSX.Element;
declare const DatePicker: ({ weekStart, className, locale, selected, onMonthChange, slots, customClassNames, includedDates, ...passThroughProps }: DatePickerProps & Partial<Omit<DatePickerProps, "locale" | "weekStart" | "className"> & {
    DayComponent?: import("react").FC<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
        active: boolean;
        date: Dayjs;
        away?: boolean | undefined;
        emoji?: string | null | undefined;
        customClassName?: {
            dayContainer?: string | undefined;
            dayActive?: string | undefined;
        } | undefined;
    }> | undefined;
    browsingDate: Dayjs;
    weekStart: number;
    month: string | null;
    nextMonthButton: () => void;
    customClassName?: {
        datePickerDate?: string | undefined;
        datePickerDateActive?: string | undefined;
    } | undefined;
    scrollToTimeSlots?: (() => void) | undefined;
    isBookingInPast: boolean;
}> & {
    customClassNames?: {
        datePickerTitle?: string | undefined;
        datePickerDays?: string | undefined;
        datePickersDates?: string | undefined;
        datePickerDatesActive?: string | undefined;
        datePickerToggle?: string | undefined;
    } | undefined;
    scrollToTimeSlots?: (() => void) | undefined;
}) => JSX.Element;
export default DatePicker;
//# sourceMappingURL=DatePicker.d.ts.map