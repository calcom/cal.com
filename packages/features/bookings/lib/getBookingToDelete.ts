import { calIdWorkflowSelect } from "@calid/features/modules/workflows/utils/getWorkflows";

import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

export const bookingToDeleteSelect = {
  ...bookingMinimalSelect,
  recurringEventId: true,
  userId: true,
  user: {
    select: {
      id: true,
      username: true,
      credentials: { select: credentialForCalendarServiceSelect }, // Not leaking at the moment, be careful with
      email: true,
      timeZone: true,
      timeFormat: true,
      name: true,
      destinationCalendar: true,
    },
  },
  location: true,
  references: {
    select: {
      uid: true,
      type: true,
      externalCalendarId: true,
      credentialId: true,
      thirdPartyRecurringEventId: true,
      delegationCredentialId: true,
    },
  },
  payment: true,
  paid: true,
  eventType: {
    select: {
      slug: true,
      owner: {
        select: {
          id: true,
          hideBranding: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      },
      calIdTeam: {
        select: {
          id: true,
          name: true,
          // parentId: true,
        },
      },
      calIdTeamId: true,
      parentId: true,
      parent: {
        select: {
          teamId: true,
          calIdTeamId: true,
        },
      },
      userId: true,
      recurringEvent: true,
      title: true,
      eventName: true,
      description: true,
      requiresConfirmation: true,
      price: true,
      currency: true,
      length: true,
      seatsPerTimeSlot: true,
      disableCancelling: true,
      bookingFields: true,
      seatsShowAttendees: true,
      metadata: true,
      hideOrganizerEmail: true,
      schedulingType: true,
      customReplyToEmail: true,
      hosts: {
        select: {
          user: true,
        },
      },
      calIdWorkflows: {
        select: {
          workflow: {
            select: calIdWorkflowSelect,
          },
        },
      },
    },
  },
  uid: true,
  id: true,
  eventTypeId: true,
  destinationCalendar: true,
  smsReminderNumber: true,
  workflowReminders: true,
  calIdWorkflowReminders: true,
  seatsReferences: true,
  responses: true,
  iCalUID: true,
  iCalSequence: true,
  status: true,
};
export async function getBookingToDelete(id: number | undefined, uid: string | undefined) {
  return await prisma.booking.findUniqueOrThrow({
    where: {
      id,
      uid,
    },
    select: bookingToDeleteSelect,
  });
}

export type BookingToDelete = Awaited<ReturnType<typeof getBookingToDelete>>;
