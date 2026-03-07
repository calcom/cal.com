import type {
  BusyTimesOutput,
  Calendar,
  ConnectedCalendar,
  ConnectedCalendarsOutput,
  GetBusyTimesOutput,
} from "../../generated/types.gen";

export type { BusyTimesOutput, Calendar, ConnectedCalendar, ConnectedCalendarsOutput, GetBusyTimesOutput };

export type ConnectedCalendarsData = ConnectedCalendarsOutput["data"];
export type BusyTimesList = GetBusyTimesOutput["data"];
