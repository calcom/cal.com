import type { QueueOptions } from "bull";
import Bull from "bull";

import type { EventNameObjectType } from "@calcom/core/event";
import {
  sendScheduledEmails,
  sendRoundRobinScheduledEmails,
  sendAttendeeRequestEmail,
  sendOrganizerRequestEmail,
  sendRescheduledEmails,
  sendScheduledSeatsEmails,
  sendRoundRobinRescheduledEmails,
  sendRoundRobinCancelledEmails,
} from "@calcom/emails/email-manager";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

const AdvancedSettings = {
  lockDuration: 10000, // Key expiration time for job locks.
};

const redisClientConfig: QueueOptions = {
  redis: process.env.REDIS_URL,
  settings: AdvancedSettings,
};

const attendeeRequestEmail = new Bull("SendAttendeeRequestEmail", redisClientConfig);

const organizerRequestEmail = new Bull("SendOrganizerRequestEmail", redisClientConfig);

const rescheduledEmails = new Bull("SendRescheduledEmails", redisClientConfig);

const scheduledSeatsEmails = new Bull("SendScheduledSeatsEmails", redisClientConfig);

const scheduledEmails = new Bull("SendScheduledEmails", redisClientConfig);

const roundRobinScheduledEmails = new Bull("SendRoundRobinScheduledEmails", redisClientConfig);

const roundRobinRescheduledEmails = new Bull("sendRoundRobinRescheduledEmails", redisClientConfig);

const roundRobinCancelledEmails = new Bull("sendRoundRobinCancelledEmails", redisClientConfig);

roundRobinCancelledEmails.process(async function (job, done) {
  const jsonOb = JSON.parse(JSON.stringify(job.data));

  try {
    const copyEventAdditionalInfo: CalendarEvent = jsonOb.copyEventAdditionalInfo;
    const cancelledMembers: Person[] = jsonOb.cancelledMembers;

    await sendRoundRobinCancelledEmails(copyEventAdditionalInfo, cancelledMembers);
    done();
  } catch (error) {
    logger.debug(
      "Error while Sending round robin scheduled emails",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

scheduledSeatsEmails.process(async function (job, done) {
  const jsonOb = JSON.parse(JSON.stringify(job.data));

  try {
    const copyEvent: CalendarEvent = jsonOb.copyEvent;
    const invitee: Person = jsonOb.invitee;
    const newSeat: boolean = jsonOb.newSeat;
    const seatsShowAttendees: boolean = jsonOb.seatsShowAttendees;
    const isHostConfirmationEmailsDisabled: boolean = jsonOb.isHostConfirmationEmailsDisabled;
    const isAttendeeConfirmationEmailDisabled: boolean = jsonOb.isAttendeeConfirmationEmailDisabled;

    await sendScheduledSeatsEmails(
      copyEvent,
      invitee,
      newSeat,
      seatsShowAttendees,
      isHostConfirmationEmailsDisabled,
      isAttendeeConfirmationEmailDisabled
    );

    done();
  } catch (error) {
    logger.debug(
      "Error while Sending scheduled emails",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

roundRobinRescheduledEmails.process(async function (job, done) {
  const jsonOb = JSON.parse(JSON.stringify(job.data));

  try {
    const copyEventAdditionalInfo: CalendarEvent = jsonOb.copyEventAdditionalInfo;
    const rescheduledMembers: Person[] = jsonOb.rescheduledMembers;

    await sendRoundRobinRescheduledEmails(copyEventAdditionalInfo, rescheduledMembers);
    done();
  } catch (error) {
    logger.debug(
      "Error while Sending round robin scheduled emails",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

rescheduledEmails.process(async function (job, done) {
  const calEvent: CalendarEvent = JSON.parse(JSON.stringify(job.data));

  try {
    await sendRescheduledEmails(calEvent);

    done();
  } catch (error) {
    logger.debug(
      "Error while Sending emails to organizers",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

organizerRequestEmail.process(async function (job, done) {
  const jsonOb = JSON.parse(JSON.stringify(job.data));

  try {
    const calEvent: CalendarEvent = jsonOb.calEvent;

    await sendOrganizerRequestEmail(calEvent);

    done();
  } catch (error) {
    logger.debug(
      "Error while Sending emails to organizers",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

attendeeRequestEmail.process(async function (job, done) {
  const jsonOb = JSON.parse(JSON.stringify(job.data));

  try {
    const calEvent: CalendarEvent = jsonOb.calEvent;
    const person: Person = jsonOb.attendees;

    await sendAttendeeRequestEmail(calEvent, person);

    done();
  } catch (error) {
    logger.debug(
      "Error while Sending emails to attendee",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

scheduledEmails.process(async function (job, done) {
  const jsonOb = JSON.parse(JSON.stringify(job.data));

  try {
    const calEvent: CalendarEvent = jsonOb.calEvent;
    const eventNameObject: EventNameObjectType = jsonOb.eventNameObject;
    const isHostConfirmationEmailsDisabled: boolean = jsonOb.isHostConfirmationEmailsDisabled;
    const isAttendeeConfirmationEmailDisabled: boolean = jsonOb.isAttendeeConfirmationEmailDisabled;

    await sendScheduledEmails(
      calEvent,
      eventNameObject,
      isHostConfirmationEmailsDisabled,
      isAttendeeConfirmationEmailDisabled
    );

    done();
  } catch (error) {
    logger.debug(
      "Error while Sending scheduled emails",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

roundRobinScheduledEmails.process(async function (job, done) {
  const jsonOb = JSON.parse(JSON.stringify(job.data));

  try {
    const copyEventAdditionalInfo: CalendarEvent = jsonOb.copyEventAdditionalInfo;
    const newBookedMembers: Person[] = jsonOb.newBookedMembers;

    await sendRoundRobinScheduledEmails(copyEventAdditionalInfo, newBookedMembers);
    done();
  } catch (error) {
    logger.debug(
      "Error while Sending round robin scheduled emails",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

export {
  attendeeRequestEmail,
  organizerRequestEmail,
  rescheduledEmails,
  scheduledSeatsEmails,
  scheduledEmails,
  roundRobinScheduledEmails,
  roundRobinRescheduledEmails,
  roundRobinCancelledEmails,
};
