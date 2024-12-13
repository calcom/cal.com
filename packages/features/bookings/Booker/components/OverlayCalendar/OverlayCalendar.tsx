import { useEffect, useState } from "react";

import { useIsPlatform } from "@calcom/atoms/monorepo";

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

  // Local state for overlay calendar enabled
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(hasSession ? true : isOverlayCalendarEnabled);

  useEffect(() => {
    if (hasSession) {
      setIsOverlayEnabled(true);
    }
  }, [hasSession]);

  const {
    handleCloseContinueModal,
    handleCloseSettingsModal,
    isOpenOverlayContinueModal,
    isOpenOverlaySettingsModal,
    handleToggleConnectedCalendar,
    checkIsCalendarToggled,
  } = useOverlayCalendar({ connectedCalendars, overlayBusyDates, onToggleCalendar });

  // On platform, avoid rendering if no connected calendars
  if (isPlatform && connectedCalendars?.length === 0) {
    return <></>;
  }

  return (
    <>
      <OverlayCalendarSwitch
        enabled={isOverlayEnabled}
        hasSession={hasSession}
        onStateChange={(state) => {
          setIsOverlayEnabled(state);
          handleSwitchStateChange(state);
        }}
      />
      {!isPlatform && (
        <OverlayCalendarContinueModal
          open={isOpenOverlayContinueModal}
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
