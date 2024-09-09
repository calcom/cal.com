/// <reference types="react" />
import type { UseCalendarsReturnType } from "../hooks/useCalendars";
type OverlayCalendarProps = Pick<UseCalendarsReturnType, "connectedCalendars" | "overlayBusyDates" | "onToggleCalendar" | "loadingConnectedCalendar" | "isOverlayCalendarEnabled"> & {
    handleClickNoCalendar: () => void;
    hasSession: boolean;
    handleClickContinue: () => void;
    handleSwitchStateChange: (state: boolean) => void;
};
export declare const OverlayCalendar: ({ connectedCalendars, overlayBusyDates, onToggleCalendar, isOverlayCalendarEnabled, loadingConnectedCalendar, handleClickNoCalendar, handleSwitchStateChange, handleClickContinue, hasSession, }: OverlayCalendarProps) => JSX.Element;
export {};
//# sourceMappingURL=OverlayCalendar.d.ts.map