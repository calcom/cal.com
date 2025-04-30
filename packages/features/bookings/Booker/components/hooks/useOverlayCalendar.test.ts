// useOverlayCalendar.test.ts
import { renderHook, act } from "@testing-library/react-hooks";
import { JSDOM } from "jsdom";
import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

import { useOverlayCalendar } from "./useOverlayCalendar";

beforeAll(() => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  global.document = dom.window.document;
  global.window = dom.window as unknown as Window & typeof globalThis;
});

describe("useOverlayCalendar", () => {
  const mockConnectedCalendars = [
    {
      credentialId: 1,
      calendars: [
        { externalId: "cal1", primary: true },
        { externalId: "cal2", primary: false },
      ],
    },
  ];

  const mockOverlayBusyDates = [];
  const mockOnToggleCalendar = vi.fn();

  it("should initialize with primary calendars toggled", () => {
    const { result } = renderHook(() =>
      useOverlayCalendar({
        connectedCalendars: mockConnectedCalendars,
        overlayBusyDates: mockOverlayBusyDates,
        onToggleCalendar: mockOnToggleCalendar,
      })
    );

    // Check if primary calendar is toggled
    expect(result.current.checkIsCalendarToggled("cal1", 1)).toBe(true);
    expect(result.current.checkIsCalendarToggled("cal2", 1)).toBe(false);
  });

  it("should toggle calendar when handleToggleConnectedCalendar is called", () => {
    const { result } = renderHook(() =>
      useOverlayCalendar({
        connectedCalendars: mockConnectedCalendars,
        overlayBusyDates: mockOverlayBusyDates,
        onToggleCalendar: mockOnToggleCalendar,
      })
    );

    act(() => {
      result.current.handleToggleConnectedCalendar("cal2", 1);
    });
    // Check if calendar was toggled
    expect(result.current.checkIsCalendarToggled("cal2", 1)).toBe(true);
    expect(mockOnToggleCalendar).toHaveBeenCalled();
  });

  it("should handle modal state correctly", () => {
    const { result } = renderHook(() =>
      useOverlayCalendar({
        connectedCalendars: mockConnectedCalendars,
        overlayBusyDates: mockOverlayBusyDates,
        onToggleCalendar: mockOnToggleCalendar,
      })
    );

    expect(result.current.isOpenOverlayContinueModal).toBe(false);
    expect(result.current.isOpenOverlaySettingsModal).toBe(false);

    act(() => {
      result.current.handleCloseContinueModal(true);
    });
    expect(result.current.isOpenOverlayContinueModal).toBe(true);

    act(() => {
      result.current.handleCloseContinueModal(false);
    });
    expect(result.current.isOpenOverlayContinueModal).toBe(false);

    act(() => {
      result.current.handleCloseSettingsModal(true);
    });
    expect(result.current.isOpenOverlaySettingsModal).toBe(true);

    act(() => {
      result.current.handleCloseSettingsModal(false);
    });
    expect(result.current.isOpenOverlaySettingsModal).toBe(false);
  });
});

afterAll(() => {
  delete global.document;
  delete global.window;
});
