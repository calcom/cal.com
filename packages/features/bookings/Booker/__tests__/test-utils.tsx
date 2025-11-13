import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import React from "react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import type { StoreApi } from "zustand";

import dayjs from "@calcom/dayjs";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { BookerStoreContext } from "../BookerStoreProvider";
import type { BookerStore } from "../store";

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  mockStore?: Partial<BookerStore>;
}

const createMockStore = (initialState?: Partial<BookerStore>): StoreApi<BookerStore> => {
  let state: BookerStore = {
    username: null,
    eventSlug: null,
    eventId: null,
    verifiedEmail: null,
    setVerifiedEmail: vi.fn(),
    month: dayjs().format("YYYY-MM"),
    setMonth: vi.fn(),
    state: "loading",
    setState: vi.fn(),
    layout: BookerLayouts.MONTH_VIEW,
    setLayout: vi.fn(),
    selectedDate: null,
    setSelectedDate: vi.fn(),
    addToSelectedDate: vi.fn(),
    selectedDatesAndTimes: null,
    setSelectedDatesAndTimes: vi.fn(),
    durationConfig: null,
    selectedDuration: null,
    setSelectedDuration: vi.fn(),
    selectedTimeslot: null,
    setSelectedTimeslot: vi.fn(),
    tentativeSelectedTimeslots: [],
    setTentativeSelectedTimeslots: vi.fn(),
    recurringEventCount: null,
    setRecurringEventCount: vi.fn(),
    recurringEventCountQueryParam: null,
    setRecurringEventCountQueryParam: vi.fn(),
    dayCount: null,
    setDayCount: vi.fn(),
    rescheduleUid: null,
    rescheduledBy: null,
    bookingUid: null,
    bookingData: null,
    setBookingData: vi.fn(),
    setRescheduleUid: vi.fn(),
    initialize: vi.fn(),
    formValues: {},
    setFormValues: vi.fn(),
    isTeamEvent: false,
    seatedEventData: {},
    setSeatedEventData: vi.fn(),
    isInstantMeeting: false,
    org: null,
    setOrg: vi.fn(),
    timezone: null,
    setTimezone: vi.fn(),
    teamMemberEmail: null,
    crmOwnerRecordType: null,
    crmAppSlug: null,
    crmRecordId: null,
    isPlatform: false,
    allowUpdatingUrlParams: true,
    ...initialState,
  };

  state.setMonth = vi.fn((month: string | null) => {
    state.month = month;
  });

  return {
    getState: () => state,
    setState: vi.fn((updater) => {
      if (typeof updater === "function") {
        const newState = updater(state);
        state = { ...state, ...newState };
      } else {
        state = { ...state, ...updater };
      }
    }),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  } as unknown as StoreApi<BookerStore>;
};

export const renderWithBookerStore = (ui: ReactElement, options?: CustomRenderOptions) => {
  const mockStore = createMockStore(options?.mockStore);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BookerStoreContext.Provider value={mockStore}>{children}</BookerStoreContext.Provider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

export * from "@testing-library/react";

export { renderWithBookerStore as render };
