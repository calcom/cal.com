import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import dayjs from "@calcom/dayjs";
import { sendCancelledEmailsAndSMS } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { deleteWebhookScheduledTriggers } from "@calcom/features/webhooks/lib/scheduleTrigger";
import EventManager from "@calcom/lib/EventManager";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { processPaymentRefund } from "@calcom/lib/payment/processPaymentRefund";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata, bookingCancelInput } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { getAllCredentialsIncludeServiceAccountKey } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getBookingToDelete } from "./getBookingToDelete";
import { handleInternalNote } from "./handleInternalNote";
import cancelAttendeeSeat from "./handleSeats/cancel/cancelAttendeeSeat";

const log = logger.getSubLogger({ prefix: ["BookingDeleteService"] });

export type PlatformParams = {
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  arePlatformEmailsEnabled?: boolean;
};

export type BookingToDelete = Awaited<ReturnType<typeof getBookingToDelete>>;

export type DeleteBookingInput = {
  userId?: number;
  bookingData: z.infer<typeof bookingCancelInput>;
} & PlatformParams;

export type DeleteBookingResponse = {
  success: boolean;
  message: string;
  onlyRemovedAttendee: boolean;
  bookingId: number;
  bookingUid: string;
  auditLog: {
    type: "record_deleted";
    wasRescheduled: boolean;
    totalUpdates: number;
    actor: { type: "system" | "user"; id?: number };
  };
};

export class BookingDeleteService {
  private bookingToDelete: BookingToDelete | null = null;
  private wasRescheduled = false;
  private totalUpdates = 0;
  private actor: { type: "system" | "user"; id?: number } = { type: "system" };

  constructor(private input: DeleteBookingInput) {}

  /**
   * Main method to delete a booking with full audit logging
   */
  async deleteBooking(): Promise<DeleteBookingResponse> {
    try {
      // Get booking data
      await this.getBookingData();

      // Validate booking can be deleted
      await this.validateBookingDeletion();

      // Process payment refund if needed
      await this.processPaymentRefund();

      // Cancel calendar events and integrations
      await this.cancelCalendarEvents();

      // Clean up webhooks and workflows
      await this.cleanupWebhooksAndWorkflows();

      // Handle internal notes
      await this.handleInternalNotes();

      // Send cancellation emails
      await this.sendCancellationEmails();

      // Create audit log entry
      const auditLog = await this.createAuditLogEntry();

      return {
        success: true,
        message: "Booking successfully deleted.",
        onlyRemovedAttendee: false,
        bookingId: this.bookingToDelete!.id,
        bookingUid: this.bookingToDelete!.uid,
        auditLog,
      };
    } catch (error) {
      log.error("Error in BookingDeleteService", safeStringify({ error }));
      throw error;
    }
  }

  /**
   * Get the booking data to be deleted
   */
  private async getBookingData() {
    const { id, uid } = this.input.bookingData;
    this.bookingToDelete = await getBookingToDelete(id, uid);

    if (!this.bookingToDelete) {
      throw new HttpError({
        statusCode: 404,
        message: "Booking not found",
      });
    }
  }

  /**
   * Validate that the booking can be deleted
   */
  private async validateBookingDeletion() {
    if (!this.bookingToDelete) {
      throw new Error("Booking data not loaded");
    }

    // Check if booking is already cancelled
    if (this.bookingToDelete.status === BookingStatus.CANCELLED) {
      throw new HttpError({
        statusCode: 400,
        message: "Booking is already cancelled",
      });
    }

    // Check if user has permission to delete this booking
    if (this.input.userId && this.bookingToDelete.userId !== this.input.userId) {
      throw new HttpError({
        statusCode: 403,
        message: "You don't have permission to delete this booking",
      });
    }

    // Set actor information
    this.actor = {
      type: this.input.userId ? "user" : "system",
      id: this.input.userId,
    };
  }

  /**
   * Process payment refund if the booking was paid
   */
  private async processPaymentRefund() {
    if (!this.bookingToDelete) return;

    if (this.bookingToDelete.paid && this.bookingToDelete.payment) {
      try {
        await processPaymentRefund(this.bookingToDelete.payment);
        this.totalUpdates++;
      } catch (error) {
        log.error("Error processing payment refund", safeStringify({ error }));
      }
    }
  }

  /**
   * Cancel calendar events and integrations
   */
  private async cancelCalendarEvents() {
    if (!this.bookingToDelete) return;

    const { allRemainingBookings, cancellationReason, seatReferenceUid, cancelSubsequentBookings } =
      this.input.bookingData;

    const { userId, platformBookingUrl, platformCancelUrl, platformClientId, platformRescheduleUrl } =
      this.input;

    // Build calendar event
    const evt = await this.buildCalendarEvent();

    // Handle seat cancellation if needed
    if (seatReferenceUid) {
      const result = await cancelAttendeeSeat(
        {
          seatReferenceUid,
          bookingToDelete: this.bookingToDelete,
        },
        { evt, webhooks: [], eventTypeInfo: {} },
        this.bookingToDelete.eventType?.metadata as EventTypeMetadata
      );

      if (result.onlyRemovedAttendee) {
        return {
          success: true,
          message: "Attendee successfully removed from booking.",
          onlyRemovedAttendee: true,
          bookingId: this.bookingToDelete.id,
          bookingUid: this.bookingToDelete.uid,
          auditLog: {
            type: "record_deleted",
            wasRescheduled: false,
            totalUpdates: 1,
            actor: this.actor,
          },
        };
      }
    }

    // Update booking status
    const updateData: Prisma.BookingUpdateInput = {
      status: BookingStatus.CANCELLED,
      cancellationReason,
      updatedAt: new Date(),
    };

    if (cancelSubsequentBookings && this.bookingToDelete.recurringEventId) {
      // Cancel all future bookings in the series
      await prisma.booking.updateMany({
        where: {
          recurringEventId: this.bookingToDelete.recurringEventId,
          startTime: {
            gte: this.bookingToDelete.startTime,
          },
        },
        data: updateData,
      });
      this.totalUpdates++;
    } else {
      // Cancel only this booking
      await prisma.booking.update({
        where: { id: this.bookingToDelete.id },
        data: updateData,
      });
      this.totalUpdates++;
    }

    // Cancel calendar events
    try {
      const bookingToDeleteEventTypeMetadataParsed = eventTypeMetaDataSchemaWithTypedApps.safeParse(
        this.bookingToDelete.eventType?.metadata || null
      );

      if (!bookingToDeleteEventTypeMetadataParsed.success) {
        log.error(
          `Error parsing metadata`,
          safeStringify({ error: bookingToDeleteEventTypeMetadataParsed?.error })
        );
        throw new Error("Error parsing metadata");
      }

      const bookingToDeleteEventTypeMetadata = bookingToDeleteEventTypeMetadataParsed.data;

      const credentials = await getAllCredentialsIncludeServiceAccountKey(this.bookingToDelete.user, {
        ...this.bookingToDelete.eventType,
        metadata: bookingToDeleteEventTypeMetadata,
      });

      const eventManager = new EventManager(
        { ...this.bookingToDelete.user, credentials },
        bookingToDeleteEventTypeMetadata?.apps
      );

      const isBookingInRecurringSeries = !!(this.bookingToDelete.recurringEventId && allRemainingBookings);

      await eventManager.cancelEvent(evt, this.bookingToDelete.references, isBookingInRecurringSeries);

      await prisma.bookingReference.deleteMany({
        where: {
          bookingId: this.bookingToDelete.id,
        },
      });

      this.totalUpdates++;
    } catch (error) {
      log.error(`Error deleting integrations`, safeStringify({ error }));
    }
  }

  /**
   * Clean up webhooks and workflow reminders
   */
  private async cleanupWebhooksAndWorkflows() {
    if (!this.bookingToDelete) return;

    const { allRemainingBookings, cancelSubsequentBookings } = this.input.bookingData;

    try {
      const webhookTriggerPromises: Promise<any>[] = [];
      const workflowReminderPromises: Promise<any>[] = [];

      // Get all bookings that need to be updated
      let updatedBookings = [this.bookingToDelete];
      if (cancelSubsequentBookings && this.bookingToDelete.recurringEventId) {
        updatedBookings = await prisma.booking.findMany({
          where: {
            recurringEventId: this.bookingToDelete.recurringEventId,
            startTime: {
              gte: this.bookingToDelete.startTime,
            },
          },
          include: {
            workflowReminders: true,
          },
        });
      }

      for (const booking of updatedBookings) {
        // Delete scheduled webhook triggers of cancelled bookings
        webhookTriggerPromises.push(deleteWebhookScheduledTriggers({ booking }));

        // Workflows - cancel all reminders for cancelled bookings
        workflowReminderPromises.push(
          WorkflowRepository.deleteAllWorkflowReminders(booking.workflowReminders)
        );
      }

      await Promise.allSettled([...webhookTriggerPromises, ...workflowReminderPromises]).then((results) => {
        const rejectedReasons = results
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => result.reason);

        if (rejectedReasons.length > 0) {
          log.error(
            "An error occurred when deleting workflow reminders and webhook triggers",
            rejectedReasons
          );
        }
      });

      this.totalUpdates += updatedBookings.length;
    } catch (error) {
      log.error("Error deleting scheduled webhooks and workflows", safeStringify({ error }));
    }
  }

  /**
   * Handle internal notes if provided
   */
  private async handleInternalNotes() {
    if (!this.bookingToDelete) return;

    const { internalNote } = this.input.bookingData;
    const teamId = await getTeamIdFromEventType(this.bookingToDelete.eventType);

    if (internalNote && teamId) {
      try {
        await handleInternalNote({
          internalNote,
          booking: this.bookingToDelete,
          userId: this.input.userId || -1,
          teamId: teamId,
        });
        this.totalUpdates++;
      } catch (error) {
        log.error("Error handlingInternalNote", safeStringify({ error }));
      }
    }
  }

  /**
   * Send cancellation emails
   */
  private async sendCancellationEmails() {
    if (!this.bookingToDelete) return;

    const { platformClientId, arePlatformEmailsEnabled } = this.input;

    try {
      const evt = await this.buildCalendarEvent();

      // TODO: if emails fail try to requeue them
      if (!platformClientId || (platformClientId && arePlatformEmailsEnabled)) {
        await sendCancelledEmailsAndSMS(
          evt,
          { eventName: this.bookingToDelete?.eventType?.eventName },
          this.bookingToDelete?.eventType?.metadata as EventTypeMetadata
        );
        this.totalUpdates++;
      }
    } catch (error) {
      log.error("Error sending cancellation emails", error);
    }
  }

  /**
   * Build calendar event for the booking
   */
  private async buildCalendarEvent(): Promise<CalendarEvent> {
    if (!this.bookingToDelete) {
      throw new Error("Booking data not loaded");
    }

    const { allRemainingBookings } = this.input.bookingData;
    const { platformBookingUrl, platformCancelUrl, platformClientId, platformRescheduleUrl } = this.input;

    const bookingToDelete = this.bookingToDelete;
    const organizer = bookingToDelete.user;
    const teamId = await getTeamIdFromEventType(bookingToDelete.eventType);

    // Build attendees list
    const attendeesListPromises: Promise<any>[] = [];
    const teamMembersPromises: Promise<any>[] = [];
    const hostEmails = new Set(bookingToDelete.eventType?.hosts?.map((host) => host.user.email) || []);

    bookingToDelete.attendees.forEach((attendee, index) => {
      const attendeeObject = {
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: {
          translate: getTranslation(attendee.locale ?? "en", "common"),
          locale: attendee.locale ?? "en",
        },
      };

      // The first attendee is the booker in all cases, so always consider them as an attendee.
      if (index === 0) {
        attendeesListPromises.push(attendeeObject);
      } else {
        const isTeamEvent = hostEmails.size > 0;
        const isTeamMember = isTeamEvent && hostEmails.has(attendee.email);

        if (isTeamMember) {
          teamMembersPromises.push(attendeeObject);
        } else {
          attendeesListPromises.push(attendeeObject);
        }
      }
    });

    const attendeesList = await Promise.all(attendeesListPromises);
    const teamMembers = await Promise.all(teamMembersPromises);
    const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

    const ownerProfile = await prisma.profile.findFirst({
      where: {
        userId: bookingToDelete.userId,
      },
    });

    const bookerUrl = await getBookerBaseUrl(
      bookingToDelete.eventType?.team?.parentId ?? ownerProfile?.organizationId ?? null
    );

    const evt: CalendarEvent = {
      bookerUrl,
      title: bookingToDelete?.title,
      length: bookingToDelete?.eventType?.length,
      type: bookingToDelete?.eventType?.slug as string,
      additionalNotes: bookingToDelete?.description,
      description: bookingToDelete.eventType?.description,
      customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
      eventTypeId: bookingToDelete.eventTypeId as number,
      ...getCalEventResponses({
        bookingFields: bookingToDelete.eventType?.bookingFields ?? null,
        booking: bookingToDelete,
      }),
      startTime: bookingToDelete?.startTime ? dayjs(bookingToDelete.startTime).format() : "",
      endTime: bookingToDelete?.endTime ? dayjs(bookingToDelete.endTime).format() : "",
      organizer: {
        id: organizer.id,
        username: organizer.username || undefined,
        email: bookingToDelete?.userPrimaryEmail ?? organizer.email,
        name: organizer.name ?? "Nameless",
        timeZone: organizer.timeZone,
        timeFormat: getTimeFormatStringFromUserTimeFormat(organizer.timeFormat),
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      uid: bookingToDelete?.uid,
      bookingId: bookingToDelete?.id,
      /* Include recurringEvent information only when cancelling all bookings */
      recurringEvent: allRemainingBookings
        ? parseRecurringEvent(bookingToDelete.eventType?.recurringEvent)
        : undefined,
      location: bookingToDelete?.location,
      destinationCalendar: bookingToDelete?.destinationCalendar
        ? [bookingToDelete?.destinationCalendar]
        : bookingToDelete?.user.destinationCalendar
        ? [bookingToDelete?.user.destinationCalendar]
        : [],
      cancellationReason: this.input.bookingData.cancellationReason,
      ...(teamMembers &&
        teamId && {
          team: {
            name: bookingToDelete?.eventType?.team?.name || "Nameless",
            members: teamMembers,
            id: teamId,
          },
        }),
      seatsPerTimeSlot: bookingToDelete.eventType?.seatsPerTimeSlot,
      seatsShowAttendees: bookingToDelete.eventType?.seatsShowAttendees,
      iCalUID: bookingToDelete.iCalUID,
      iCalSequence: bookingToDelete.iCalSequence + 1,
      platformClientId,
      platformRescheduleUrl,
      platformCancelUrl,
      hideOrganizerEmail: bookingToDelete.eventType?.hideOrganizerEmail,
      platformBookingUrl,
      customReplyToEmail: bookingToDelete.eventType?.customReplyToEmail,
    };

    return evt;
  }

  /**
   * Create audit log entry for the deletion
   */
  private async createAuditLogEntry() {
    const auditLog = {
      type: "record_deleted" as const,
      wasRescheduled: this.wasRescheduled,
      totalUpdates: this.totalUpdates,
      actor: this.actor,
    };

    // TODO: Implement actual audit log storage
    // For now, we'll just log it
    log.info("Audit log entry created", safeStringify(auditLog));

    return auditLog;
  }
}

/**
 * Convenience function to delete a booking with audit logging
 */
export async function deleteBooking(input: DeleteBookingInput): Promise<DeleteBookingResponse> {
  const service = new BookingDeleteService(input);
  return service.deleteBooking();
}
