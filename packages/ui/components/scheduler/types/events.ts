import { BookingStatus } from "@calcom/prisma/client";

export interface SchedulerEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  source?: string;
  status?: BookingStatus;
}
