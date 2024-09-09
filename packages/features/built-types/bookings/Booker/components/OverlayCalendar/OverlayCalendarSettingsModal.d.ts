/// <reference types="react" />
import type { UseCalendarsReturnType } from "../hooks/useCalendars";
interface IOverlayCalendarSettingsModalProps {
    open?: boolean;
    onClose?: (state: boolean) => void;
    onClickNoCalendar?: () => void;
    isLoading: boolean;
    connectedCalendars: UseCalendarsReturnType["connectedCalendars"];
    onToggleConnectedCalendar: (externalCalendarId: string, credentialId: number) => void;
    checkIsCalendarToggled: (externalCalendarId: string, credentialId: number) => boolean;
}
export declare function OverlayCalendarSettingsModal({ connectedCalendars, isLoading, open, onClose, onClickNoCalendar, onToggleConnectedCalendar, checkIsCalendarToggled, }: IOverlayCalendarSettingsModalProps): JSX.Element;
export {};
//# sourceMappingURL=OverlayCalendarSettingsModal.d.ts.map