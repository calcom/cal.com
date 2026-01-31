import type { IOutOfOfficeData } from "@calcom/features/availability/lib/getUserAvailability";
import type { EventBusyDetails } from "@calcom/types/Calendar";

// Removes title from busy times to prevent leaking meeting details
export function maskBusyTimes(busyTimes: EventBusyDetails[]): EventBusyDetails[] {
  return busyTimes.map(({ title: _title, ...rest }) => rest);
}

// Removes reason, notes and emoji from OOO data to prevent leaking personal info
export function maskOutOfOfficeData(datesOutOfOffice: IOutOfOfficeData): IOutOfOfficeData {
  const masked: IOutOfOfficeData = {};

  for (const date of Object.keys(datesOutOfOffice)) {
    const data = datesOutOfOffice[date];
    masked[date] = {
      fromUser: data.fromUser,
      toUser: data.toUser,
    };
  }

  return masked;
}
