import create from "zustand";

import dayjs from "@calcom/dayjs";

import { SchedulerComponentProps, SchedulerStoreProps } from "../types/state";

export const defaultState: SchedulerComponentProps = {
  view: "week",
  startDate: new Date(),
  endDate: dayjs().add(6, "days").toDate(),
  events: [],
  startingDayOfWeek: 0,
};

export const useSchedulerStore = create<SchedulerStoreProps>((set) => ({
  ...defaultState,
  setView: (view: SchedulerComponentProps["view"]) => set({ view }),
  setStartDate: (startDate: SchedulerComponentProps["startDate"]) => set({ startDate }),
  setEndDate: (endDate: SchedulerComponentProps["endDate"]) => set({ endDate }),
  setEvents: (events: SchedulerComponentProps["events"]) => set({ events }),
  setStartingDayOfWeek: (startingDayOfWeek: SchedulerComponentProps["startingDayOfWeek"]) =>
    set({ startingDayOfWeek }),
  // This looks a bit odd but init state only overrides the public props + actions as we don't want to override our internal state
  initState: (state) => {
    set({
      ...state,
    });
  },
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  handleDateChange: (payload) =>
    set((state) => {
      const { startDate, endDate } = state;
      if (payload === "INCREMENT") {
        const newStartDate = dayjs(startDate).add(1, state.view).toDate();
        const newEndDate = dayjs(endDate).add(1, state.view).toDate();

        if (state.minDate && newStartDate < state.minDate) {
          return {
            startDate,
            endDate,
          };
        }
        if (state.maxDate && newEndDate > state.maxDate) {
          return {
            startDate,
            endDate,
          };
        }

        state.onDateChange && state.onDateChange(newStartDate, newEndDate);
        return {
          startDate: newStartDate,
          endDate: newEndDate,
        };
      }
      const newStartDate = dayjs(startDate).subtract(1, state.view).toDate();
      const newEndDate = dayjs(endDate).subtract(1, state.view).toDate();
      state.onDateChange && state.onDateChange(newStartDate, newEndDate);
      return {
        startDate: newStartDate,
        endDate: newEndDate,
      };
    }),
}));
