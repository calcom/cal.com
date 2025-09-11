import type { MigrationContext } from "../types";

export async function migrateBookings(ctx: MigrationContext) {
  ctx.log("Migrating Bookings...");

  const oldBookings = await ctx.oldDb.booking.findMany();

  await ctx.processBatch(oldBookings, async (batch) => {
    const newBookings = await Promise.all(
      batch.map(async (oldBooking: any) => {
        try {
          const userId = oldBooking.userId ? ctx.idMappings.users[oldBooking.userId.toString()] : null;
          const eventTypeId = oldBooking.eventTypeId
            ? ctx.idMappings.eventTypes[oldBooking.eventTypeId.toString()]
            : null;
          const reassignById = oldBooking.reassignById
            ? ctx.idMappings.users[oldBooking.reassignById.toString()]
            : null;

          const newBooking = await ctx.newDb.booking.create({
            data: {
              uid: oldBooking.uid,
              idempotencyKey: oldBooking.idempotencyKey,
              userId: userId,
              userPrimaryEmail: oldBooking.userPrimaryEmail,
              eventTypeId: eventTypeId,
              title: oldBooking.title,
              description: oldBooking.description,
              customInputs: oldBooking.customInputs,
              responses: oldBooking.responses,
              startTime: oldBooking.startTime,
              endTime: oldBooking.endTime,
              location: oldBooking.location,
              createdAt: oldBooking.createdAt,
              updatedAt: oldBooking.updatedAt,
              status: oldBooking.status,
              paid: oldBooking.paid,
              destinationCalendarId: oldBooking.destinationCalendarId,
              cancellationReason: oldBooking.cancellationReason,
              rejectionReason: oldBooking.rejectionReason,
              reassignReason: oldBooking.reassignReason,
              reassignById: reassignById,
              dynamicEventSlugRef: oldBooking.dynamicEventSlugRef,
              dynamicGroupSlugRef: oldBooking.dynamicGroupSlugRef,
              rescheduled: oldBooking.rescheduled,
              fromReschedule: oldBooking.fromReschedule,
              recurringEventId: oldBooking.recurringEventId,
              smsReminderNumber: oldBooking.smsReminderNumber,
              scheduledJobs: oldBooking.scheduledJobs,
              metadata: oldBooking.metadata,
              isRecorded: oldBooking.isRecorded,
              iCalUID: oldBooking.iCalUID,
              iCalSequence: oldBooking.iCalSequence,
              rating: oldBooking.rating,
              ratingFeedback: oldBooking.ratingFeedback,
              noShowHost: oldBooking.noShowHost,
              oneTimePassword: oldBooking.oneTimePassword,
              cancelledBy: oldBooking.cancelledBy,
              rescheduledBy: oldBooking.rescheduledBy,
              creationSource: oldBooking.creationSource,
            },
          });

          return newBooking;
        } catch (error) {
          ctx.logError(`Failed to migrate booking ${oldBooking.id}`, error);
          return null;
        }
      })
    );
    return newBookings.filter(Boolean);
  });

  ctx.log(`Migrated ${oldBookings.length} bookings`);
}

export async function migrateAttendees(ctx: MigrationContext) {
  ctx.log("Migrating Attendees...");

  const oldAttendees = await ctx.oldDb.attendee.findMany();

  await ctx.processBatch(oldAttendees, async (batch) => {
    const newAttendees = await Promise.all(
      batch.map(async (oldAttendee: any) => {
        try {
          const newAttendee = await ctx.newDb.attendee.create({
            data: {
              email: oldAttendee.email,
              name: oldAttendee.name,
              timeZone: oldAttendee.timeZone,
              phoneNumber: oldAttendee.phoneNumber,
              locale: oldAttendee.locale,
              bookingId: oldAttendee.bookingId,
              noShow: oldAttendee.noShow,
            },
          });

          return newAttendee;
        } catch (error) {
          ctx.logError(`Failed to migrate attendee ${oldAttendee.id}`, error);
          return null;
        }
      })
    );
    return newAttendees.filter(Boolean);
  });

  ctx.log(`Migrated ${oldAttendees.length} attendees`);
}

export async function migrateBookingReferences(ctx: MigrationContext) {
  ctx.log("Migrating Booking References...");

  const oldReferences = await ctx.oldDb.bookingReference.findMany();

  await ctx.processBatch(oldReferences, async (batch) => {
    const newReferences = await Promise.all(
      batch.map(async (oldRef: any) => {
        try {
          const credentialId = oldRef.credentialId
            ? ctx.idMappings.credentials[oldRef.credentialId.toString()]
            : null;

          const newRef = await ctx.newDb.bookingReference.create({
            data: {
              type: oldRef.type,
              uid: oldRef.uid,
              meetingId: oldRef.meetingId,
              thirdPartyRecurringEventId: oldRef.thirdPartyRecurringEventId,
              meetingPassword: oldRef.meetingPassword,
              meetingUrl: oldRef.meetingUrl,
              bookingId: oldRef.bookingId,
              externalCalendarId: oldRef.externalCalendarId,
              deleted: oldRef.deleted,
              credentialId: credentialId,
              delegationCredentialId: oldRef.delegationCredentialId,
              domainWideDelegationCredentialId: oldRef.domainWideDelegationCredentialId,
            },
          });

          return newRef;
        } catch (error) {
          ctx.logError(`Failed to migrate booking reference ${oldRef.id}`, error);
          return null;
        }
      })
    );
    return newReferences.filter(Boolean);
  });

  ctx.log(`Migrated ${oldReferences.length} booking references`);
}

export async function migratePayments(ctx: MigrationContext) {
  ctx.log("Migrating Payments...");

  const oldPayments = await ctx.oldDb.payment.findMany();

  await ctx.processBatch(oldPayments, async (batch) => {
    const newPayments = await Promise.all(
      batch.map(async (oldPayment: any) => {
        try {
          const newPayment = await ctx.newDb.payment.create({
            data: {
              uid: oldPayment.uid,
              appId: oldPayment.appId,
              bookingId: oldPayment.bookingId,
              amount: oldPayment.amount,
              fee: oldPayment.fee,
              currency: oldPayment.currency,
              success: oldPayment.success,
              refunded: oldPayment.refunded,
              data: oldPayment.data,
              externalId: oldPayment.externalId,
              paymentOption: oldPayment.paymentOption,
            },
          });

          ctx.idMappings.payments[oldPayment.id.toString()] = newPayment.id;
          return newPayment;
        } catch (error) {
          ctx.logError(`Failed to migrate payment ${oldPayment.id}`, error);
          return null;
        }
      })
    );
    return newPayments.filter(Boolean);
  });

  ctx.log(`Migrated ${oldPayments.length} payments`);
}

export async function migrateBookingSeats(ctx: MigrationContext) {
  ctx.log("Migrating Booking Seats...");

  const oldSeats = await ctx.oldDb.bookingSeat.findMany();

  await ctx.processBatch(oldSeats, async (batch) => {
    const newSeats = await Promise.all(
      batch.map(async (oldSeat: any) => {
        try {
          const newSeat = await ctx.newDb.bookingSeat.create({
            data: {
              referenceUid: oldSeat.referenceUid,
              bookingId: oldSeat.bookingId,
              attendeeId: oldSeat.attendeeId,
              data: oldSeat.data,
              metadata: oldSeat.metadata,
            },
          });

          ctx.idMappings.bookingSeats[oldSeat.id.toString()] = newSeat.id;
          return newSeat;
        } catch (error) {
          ctx.logError(`Failed to migrate booking seat ${oldSeat.id}`, error);
          return null;
        }
      })
    );
    return newSeats.filter(Boolean);
  });

  ctx.log(`Migrated ${oldSeats.length} booking seats`);
}

export async function runPhase8(ctx: MigrationContext) {
  ctx.log("=== PHASE 8: Bookings & Related ===");
  await migrateBookings(ctx);
  await migrateAttendees(ctx);
  await migrateBookingReferences(ctx);
  await migratePayments(ctx);
  await migrateBookingSeats(ctx);
}
