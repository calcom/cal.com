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
  const {
    handleCloseContinueModal,
    handleCloseSettingsModal,
    isOpenOverlayContinueModal,
    isOpenOverlaySettingsModal,
    handleToggleConnectedCalendar,
    checkIsCalendarToggled,
  } = useOverlayCalendar({ connectedCalendars, overlayBusyDates, onToggleCalendar });

  // on platform we don't handle connecting to third party calendar via booker yet
  if (isPlatform && connectedCalendars?.length === 0) {
    return <></>;
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
