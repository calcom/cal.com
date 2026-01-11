import { vi } from "vitest";

const mockOverlayCalendar = vi.fn(() => {
  return {
    connectedCalendars: [],
    overlayBusyDates: [],
    onToggleCalendar: vi.fn(),
    isOverlayCalendarEnabled: false,
    loadingConnectedCalendar: false,
    handleClickNoCalendar: vi.fn(),
    handleSwitchStateChange: vi.fn(),
    handleClickContinue: vi.fn(),
    hasSession: false,
  };
});

vi.mock("../OverlayCalendar/OverlayCalendar", () => ({
  OverlayCalendar: mockOverlayCalendar,
}));

export default mockOverlayCalendar;
