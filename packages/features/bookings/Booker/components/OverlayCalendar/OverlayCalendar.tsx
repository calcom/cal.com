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
> & { handleClickNoCalendar: () => void };

export const OverlayCalendar = ({
  connectedCalendars,
  overlayBusyDates,
  onToggleCalendar,
  isOverlayCalendarEnabled,
  loadingConnectedCalendar,
  handleClickNoCalendar,
}: OverlayCalendarProps) => {
  const {
    handleCloseContinueModal,
    handleCloseSettingsModal,
    isOpenOverlayContinueModal,
    isOpenOverlaySettingsModal,
    handleToggleConnectedCalendar,
    checkIsCalendarToggled,
  } = useOverlayCalendar({ connectedCalendars, overlayBusyDates, onToggleCalendar });
  return (
    <>
      <OverlayCalendarSwitch enabled={isOverlayCalendarEnabled} />
      <OverlayCalendarContinueModal open={isOpenOverlayContinueModal} onClose={handleCloseContinueModal} />
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
