import type { UseCalendarsReturnType } from "./useCalendars";
export type UseOverlayCalendarReturnType = ReturnType<typeof useOverlayCalendar>;
export declare const useOverlayCalendar: ({ connectedCalendars, overlayBusyDates, onToggleCalendar, }: Pick<UseCalendarsReturnType, "connectedCalendars" | "overlayBusyDates" | "onToggleCalendar">) => {
    isOpenOverlayContinueModal: boolean;
    isOpenOverlaySettingsModal: boolean;
    handleCloseContinueModal: (val: boolean) => void;
    handleCloseSettingsModal: (val: boolean) => void;
    handleToggleConnectedCalendar: (externalCalendarId: string, credentialId: number) => void;
    checkIsCalendarToggled: (externalId: string, credentialId: number) => boolean;
};
//# sourceMappingURL=useOverlayCalendar.d.ts.map