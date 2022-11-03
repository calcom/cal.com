import create from "zustand";

import dayjs from "@calcom/dayjs";

import { SchedulerComponentProps, SchedulerStoreProps } from "../types/state";

export const defaultState: SchedulerComponentProps = {
  view: "week",
  startDate: new Date(),
  endDate: dayjs().add(1, "week").toDate(),
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
}));
