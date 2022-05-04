import { CalendarEvent } from "@calcom/types/Calendar";

import AttendeeRequestRescheduledEmail from "./templates/attendee-request-reschedule-email";
import OrganizerRequestRescheduledEmail from "./templates/organizer-request-reschedule-email";

export const sendRequestRescheduleEmail = async (
  calEvent: CalendarEvent,
  metadata: { rescheduleLink: string }
) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const requestRescheduleEmail = new AttendeeRequestRescheduledEmail(calEvent, metadata);
        resolve(requestRescheduleEmail.sendEmail());
      } catch (e) {
        reject(console.error("AttendeeRequestRescheduledEmail.sendEmail failed", e));
      }
    })
  );

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const requestRescheduleEmail = new OrganizerRequestRescheduledEmail(calEvent, metadata);
        resolve(requestRescheduleEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerRequestRescheduledEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};
