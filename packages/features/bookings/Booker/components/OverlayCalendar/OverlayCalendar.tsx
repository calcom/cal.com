import { useEffect } from "react";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";

import type { UseCalendarsReturnType } from "../hooks/useCalendars";
import { useOverlayCalendar } from "../hooks/useOverlayCalendar";
import { OverlayCalendarContinueModal } from "./OverlayCalendarContinueModal";
import { OverlayCalendarSettingsModal } from "./OverlayCalendarSettingsModal";
import { OverlayCalendarSwitch } from "./OverlayCalendarSwitch";

type OverlayCalendarProps = Pick<
  UseCalendarsReturnType,
  | "connectedCalendars"
  | "overlayBusyDates"
  | "onToggleCalendar"
  | "loadingConnectedCalendar"
  | "isOverlayCalendarEnabled"
> & {
  handleClickNoCalendar: () => void;
  hasSession: boolean;
  handleClickContinue: () => void;
  handleSwitchStateChange: (state: boolean) => void;
};

export const OverlayCalendar = ({
  connectedCalendars,
  overlayBusyDates,
  onToggleCalendar,
  isOverlayCalendarEnabled,
  loadingConnectedCalendar,
  handleClickNoCalendar,
  handleSwitchStateChange,
  handleClickContinue,
  hasSession,
}: OverlayCalendarProps) => {
  const isPlatform = useIsPlatform();
  const {
    handleCloseContinueModal,
    handleCloseSettingsModal,
    isOpenOverlayContinueModal,
    isOpenOverlaySettingsModal,
    handleToggleConnectedCalendar,
    checkIsCalendarToggled,
  } = useOverlayCalendar({ connectedCalendars, overlayBusyDates, onToggleCalendar });

  // Adding to avoid flickering of continue modal due to stale state
  useEffect(() => {
    if (isOverlayCalendarEnabled) {
      handleCloseContinueModal(false);
    }
  }, [isOverlayCalendarEnabled, handleCloseContinueModal]);

  // on platform we don't handle connecting to third party calendar via booker yet
  if (isPlatform && connectedCalendars?.length === 0) {
    return null;
  }

  return (
    <>
      <OverlayCalendarSwitch
        enabled={isOverlayCalendarEnabled}
        hasSession={hasSession}
        onStateChange={handleSwitchStateChange}
      />
      {!isPlatform && (
        <OverlayCalendarContinueModal
          open={isOpenOverlayContinueModal && !isOverlayCalendarEnabled}
          onClose={handleCloseContinueModal}
          onContinue={handleClickContinue}
        />
      )}
      <OverlayCalendarSettingsModal
        connectedCalendars={connectedCalendars}
        open={isOpenOverlaySettingsModal}
        onClose={handleCloseSettingsModal}
        isLoading={loadingConnectedCalendar}
        onToggleConnectedCalendar={handleToggleConnectedCalendar}
        onClickNoCalendar={() => {
          handleClickNoCalendar();
        }}
        checkIsCalendarToggled={checkIsCalendarToggled}
      />
    </>
  );
};
