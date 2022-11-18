import create from "zustand";

import dayjs from "@calcom/dayjs";

import { blockingDates } from "../_storybookData";
import {
  SchedulerComponentProps,
  SchedulerPublicActions,
  SchedulerState,
  SchedulerStoreProps,
} from "../types/state";
import { mergeOverlappingDateRanges, weekdayDates } from "../utils";

const defaultState: SchedulerComponentProps = {
  view: "week",
  startDate: weekdayDates(0, new Date()).startDate,
  endDate: weekdayDates(0, new Date()).endDate,
  events: [],
  startHour: 0,
  endHour: 23,
  gridCellsPerHour: 4,
};

export const useSchedulerStore = create<SchedulerStoreProps>((set) => ({
  ...defaultState,
  setView: (view: SchedulerComponentProps["view"]) => set({ view }),
  setStartDate: (startDate: SchedulerComponentProps["startDate"]) => set({ startDate }),
  setEndDate: (endDate: SchedulerComponentProps["endDate"]) => set({ endDate }),
  setEvents: (events: SchedulerComponentProps["events"]) => set({ events }),
  // This looks a bit odd but init state only overrides the public props + actions as we don't want to override our internal state
  initState: (state: SchedulerState & SchedulerPublicActions) => {
    // Handle sorting of events if required
    let events = state.events;

    if (state.sortEvents) {
      events = state.events.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    const blockingDates = mergeOverlappingDateRanges(state.blockingDates || []); // We merge overlapping dates so we don't get duplicate blocking "Cells" in the UI
    console.log(blockingDates);
    set({
      ...state,
      blockingDates,
      events,
    });
  },
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  handleDateChange: (payload) =>
    set((state) => {
      const { startDate, endDate } = state;
      if (payload === "INCREMENT") {
        const newStartDate = dayjs(startDate).add(1, state.view).toDate();
        const newEndDate = dayjs(endDate).add(1, state.view).toDate();

        // Do nothing if
        if (state.minDate && newStartDate < state.minDate) {
          return {
            startDate,
            endDate,
          };
        } else if (state.maxDate && newEndDate > state.maxDate) {
          return {
            startDate,
            endDate,
          };
        }

        // We call this callback if we have it -> Allows you to change your state outside of the component
        state.onDateChange && state.onDateChange(newStartDate, newEndDate);
        return {
          startDate: newStartDate,
          endDate: newEndDate,
        };
      } else {
        const newStartDate = dayjs(startDate).subtract(1, state.view).toDate();
        const newEndDate = dayjs(endDate).subtract(1, state.view).toDate();
        state.onDateChange && state.onDateChange(newStartDate, newEndDate);
        return {
          startDate: newStartDate,
          endDate: newEndDate,
        };
      }
    }),
}));
