import type { DB } from "@calcom/kysely";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import type { Kysely } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

import {
  GetBookingsRepositoryBase,
  type FindManyParams,
  type IGetBookingsRepositoryDeps,
} from "./GetBookingsRepositoryBase";

export class GetBookingsRepositoryForApiV2 extends GetBookingsRepositoryBase {
  constructor(deps: IGetBookingsRepositoryDeps) {
    super(deps);
  }

  async findMany(params: FindManyParams) {
    const { bookingIds, orderBy, queryUnion } = await this.prepareBookingQuery(params);

    const plainBookings =
      bookingIds.length === 0 ? [] : await this.fetchBookingsWithRelations(params.kysely, bookingIds, orderBy);

    return this.processBookingsResult({
      ...params,
      plainBookings,
      orderBy,
      queryUnion,
    });
  }

  private async fetchBookingsWithRelations(
    kysely: Kysely<DB>,
    bookingIds: number[],
    orderBy: { key: "startTime" | "endTime" | "createdAt" | "updatedAt"; order: "desc" | "asc" }
  ) {
    return kysely
      .selectFrom("Booking")
      .where("id", "in", bookingIds)
      .select((eb) => [
        "Booking.id",
        "Booking.title",
        "Booking.userPrimaryEmail",
        "Booking.description",
        "Booking.customInputs",
        "Booking.startTime",
        "Booking.createdAt",
        "Booking.updatedAt",
        "Booking.endTime",
        "Booking.metadata",
        "Booking.uid",
        eb.cast<Prisma.JsonValue>(eb.ref("Booking.responses"), "jsonb").as("responses"),
        "Booking.recurringEventId",
        "Booking.location",
        eb
          .cast<BookingStatus>(
            eb
              .case()
              .when("Booking.status", "=", "cancelled")
              .then(BookingStatus.CANCELLED)
              .when("Booking.status", "=", "accepted")
              .then(BookingStatus.ACCEPTED)
              .when("Booking.status", "=", "rejected")
              .then(BookingStatus.REJECTED)
              .when("Booking.status", "=", "pending")
              .then(BookingStatus.PENDING)
              .when("Booking.status", "=", "awaiting_host")
              .then(BookingStatus.AWAITING_HOST)
              .else(BookingStatus.PENDING)
              .end(),
            "varchar"
          )
          .as("status"),
        "Booking.paid",
        "Booking.fromReschedule",
        "Booking.rescheduled",
        "Booking.rescheduledBy",
        "Booking.cancelledBy",
        "Booking.isRecorded",
        "Booking.cancellationReason",
        "Booking.rejectionReason",
        jsonObjectFrom(
          eb
            .selectFrom("App_RoutingForms_FormResponse")
            .select("id")
            .whereRef("App_RoutingForms_FormResponse.routedToBookingUid", "=", "Booking.uid")
        ).as("routedFromRoutingFormReponse"),
        jsonObjectFrom(
          eb
            .selectFrom("EventType")
            .select((eb) => [
              "EventType.slug",
              "EventType.id",
              "EventType.title",
              "EventType.eventName",
              "EventType.price",
              "EventType.recurringEvent",
              "EventType.currency",
              "EventType.metadata",
              "EventType.disableGuests",
              "EventType.bookingFields",
              "EventType.seatsPerTimeSlot",
              "EventType.seatsShowAttendees",
              "EventType.seatsShowAvailabilityCount",
              "EventType.eventTypeColor",
              "EventType.customReplyToEmail",
              "EventType.allowReschedulingPastBookings",
              "EventType.hideOrganizerEmail",
              "EventType.disableCancelling",
              "EventType.disableRescheduling",
              "EventType.minimumRescheduleNotice",
              "EventType.teamId",
              "EventType.parentId",
              eb
                .cast<SchedulingType | null>(
                  eb
                    .case()
                    .when("EventType.schedulingType", "=", "roundRobin")
                    .then(SchedulingType.ROUND_ROBIN)
                    .when("EventType.schedulingType", "=", "collective")
                    .then(SchedulingType.COLLECTIVE)
                    .when("EventType.schedulingType", "=", "managed")
                    .then(SchedulingType.MANAGED)
                    .else(null)
                    .end(),
                  "varchar"
                )
                .as("schedulingType"),
              jsonArrayFrom(
                eb
                  .selectFrom("Host")
                  .select((eb) => [
                    "Host.userId",
                    jsonObjectFrom(
                      eb
                        .selectFrom("users")
                        .select(["users.id", "users.email"])
                        .whereRef("Host.userId", "=", "users.id")
                    ).as("user"),
                  ])
                  .whereRef("Host.eventTypeId", "=", "EventType.id")
              ).as("hosts"),
              "EventType.length",
              jsonObjectFrom(
                eb
                  .selectFrom("Team")
                  .select(["Team.id", "Team.name", "Team.slug"])
                  .whereRef("EventType.teamId", "=", "Team.id")
              ).as("team"),
              jsonArrayFrom(
                eb
                  .selectFrom("HostGroup")
                  .select(["HostGroup.id", "HostGroup.name"])
                  .whereRef("HostGroup.eventTypeId", "=", "EventType.id")
              ).as("hostGroups"),
            ])
            .whereRef("EventType.id", "=", "Booking.eventTypeId")
        ).as("eventType"),
        jsonArrayFrom(
          eb
            .selectFrom("BookingReference")
            .selectAll()
            .whereRef("BookingReference.bookingId", "=", "Booking.id")
        ).as("references"),
        jsonArrayFrom(
          eb
            .selectFrom("Payment")
            .select([
              "Payment.paymentOption",
              "Payment.amount",
              "Payment.currency",
              "Payment.success",
              "Payment.appId",
              "Payment.refunded",
            ])
            .whereRef("Payment.bookingId", "=", "Booking.id")
        ).as("payment"),
        jsonObjectFrom(
          eb
            .selectFrom("users")
            .select([
              "users.id",
              "users.name",
              "users.email",
              "users.avatarUrl",
              "users.username",
              "users.timeZone",
            ])
            .whereRef("Booking.userId", "=", "users.id")
        ).as("user"),
        jsonArrayFrom(
          eb.selectFrom("Attendee").selectAll().whereRef("Attendee.bookingId", "=", "Booking.id")
        ).as("attendees"),
        jsonArrayFrom(
          eb
            .selectFrom("BookingSeat")
            .select((eb) => [
              "BookingSeat.referenceUid",
              jsonObjectFrom(
                eb
                  .selectFrom("Attendee")
                  .select(["Attendee.email"])
                  .whereRef("BookingSeat.attendeeId", "=", "Attendee.id")
              ).as("attendee"),
            ])
            .whereRef("BookingSeat.bookingId", "=", "Booking.id")
        ).as("seatsReferences"),
        jsonArrayFrom(
          eb
            .selectFrom("AssignmentReason")
            .selectAll()
            .whereRef("AssignmentReason.bookingId", "=", "Booking.id")
            .orderBy("AssignmentReason.createdAt", "desc")
            .limit(1)
        ).as("assignmentReason"),
        jsonObjectFrom(
          eb
            .selectFrom("BookingReport")
            .select([
              "BookingReport.id",
              "BookingReport.reportedById",
              "BookingReport.reason",
              "BookingReport.description",
              "BookingReport.createdAt",
            ])
            .whereRef("BookingReport.bookingUid", "=", "Booking.uid")
        ).as("report"),
      ])
      .orderBy(orderBy.key, orderBy.order)
      .execute();
  }
}
