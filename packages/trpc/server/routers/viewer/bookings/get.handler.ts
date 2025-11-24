import { generateOccurrencesFromRRule } from "@calid/features/modules/teams/lib/recurrenceUtil";
import type { Booking, Prisma, Prisma as PrismaClientType } from "@prisma/client";
import { sql } from "kysely";
import type { Kysely } from "kysely";
import { type SelectQueryBuilder } from "kysely";
import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";

import dayjs from "@calcom/dayjs";
import { isTextFilterValue } from "@calcom/features/data-table/lib/utils";
import type { DB } from "@calcom/kysely";
import kysely from "@calcom/kysely";
import getAllUserBookings from "@calcom/lib/bookings/getAllUserBookings";
import { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

type InputByStatus = "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";

const log = logger.getSubLogger({ prefix: ["bookings.get"] });

export const getHandler = async ({ ctx, input }: GetOptions) => {
  // using offset actually because cursor pagination requires a unique column
  // for orderBy, but we don't use a unique column in our orderBy
  const take = input.limit;
  const skip = input.offset;
  const { prisma, user } = ctx;
  const defaultStatus = "upcoming";
  const bookingListingByStatus = [input.filters.status || defaultStatus];

  const { bookings, recurringInfo, totalCount } = await getAllUserBookings({
    ctx: {
      user: { id: user.id, email: user.email, orgId: user?.profile?.organizationId },
      prisma: prisma,
      kysely: kysely,
    },
    bookingListingByStatus: bookingListingByStatus,
    take,
    skip,
    filters: input.filters,
  });

  // //previously we were passing recurring bookings with no upcoming occurrences as well
  //   return {
  //   bookings,
  //   recurringInfo,
  //   totalCount,
  // };
  // Filter out recurring bookings with no upcoming occurrences
  const now = new Date();
  const filteredBookings = bookings.filter((booking) => {
    const metadata = booking.metadata as Record<string, any> | null;

    // If it's not a recurring booking, keep it
    if (!metadata?.recurringEvent) {
      return true;
    }

    // Find the corresponding recurringInfo entry
    const recurringEntry = recurringInfo.find((info) => info.recurringEventId === booking.uid);

    if (!recurringEntry) {
      // If we can't find recurring info, keep the booking to be safe
      return true;
    }

    // Check if there are any upcoming occurrences
    const hasUpcomingOccurrences =
      recurringEntry.bookings.ACCEPTED.some((date) => date > now) ||
      recurringEntry.bookings.PENDING.some((date) => date > now) ||
      recurringEntry.bookings.AWAITING_HOST.some((date) => date > now);

    return hasUpcomingOccurrences;
  });

  // Also filter the recurringInfo to only include entries with upcoming occurrences
  const filteredRecurringInfo = recurringInfo.filter((info) => {
    const hasUpcomingOccurrences =
      info.bookings.ACCEPTED.some((date) => date > now) ||
      info.bookings.PENDING.some((date) => date > now) ||
      info.bookings.AWAITING_HOST.some((date) => date > now);

    return hasUpcomingOccurrences;
  });

  // Adjust the total count to reflect the filtered bookings
  const removedBookingsCount = bookings.length - filteredBookings.length;
  const adjustedTotalCount = Math.max(0, totalCount - removedBookingsCount);

  return {
    bookings: filteredBookings,
    recurringInfo: filteredRecurringInfo,
    totalCount: adjustedTotalCount,
  };
};

type BookingsUnionQuery = SelectQueryBuilder<
  DB,
  "Booking",
  Pick<Booking, "id" | "createdAt" | "updatedAt" | "startTime" | "endTime">
>;

export async function getBookings({
  user,
  prisma,
  kysely,
  bookingListingByStatus,
  sort,
  filters,
  take,
  skip,
}: {
  user: { id: number; email: string; orgId?: number | null };
  filters: TGetInputSchema["filters"];
  prisma: PrismaClient;
  kysely: Kysely<DB>;
  bookingListingByStatus: InputByStatus[];
  sort?: {
    sortStart?: "asc" | "desc";
    sortEnd?: "asc" | "desc";
    sortCreated?: "asc" | "desc";
    sortUpdated?: "asc" | "desc";
  };
  take: number;
  skip: number;
}) {
  const membershipIdsWhereUserIsAdminOwner = (
    await prisma.calIdMembership.findMany({
      where: {
        userId: user.id,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
      select: {
        id: true,
      },
    })
  ).map((membership) => membership.id);

  const membershipConditionWhereUserIsAdminOwner = {
    some: {
      id: { in: membershipIdsWhereUserIsAdminOwner },
    },
  };

  const [
    eventTypeIdsFromTeamIdsFilter,
    attendeeEmailsFromUserIdsFilter,
    eventTypeIdsFromEventTypeIdsFilter,
    eventTypeIdsWhereUserIsAdminOrOwner,
    userIdsAndEmailsWhereUserIsAdminOrOwner,
  ] = await Promise.all([
    getEventTypeIdsFromTeamIdsFilter(prisma, filters?.teamIds),
    getAttendeeEmailsFromUserIdsFilter(prisma, user.email, filters?.userIds),
    getEventTypeIdsFromEventTypeIdsFilter(prisma, filters?.eventTypeIds),
    getEventTypeIdsWhereUserIsAdminOrOwner(prisma, membershipConditionWhereUserIsAdminOwner),
    getUserIdsAndEmailsWhereUserIsAdminOrOwner(prisma, membershipConditionWhereUserIsAdminOwner),
  ]);

  const bookingQueries: { query: BookingsUnionQuery; tables: (keyof DB)[] }[] = [];

  // If user is organization owner/admin, contains organization members emails and ids (organization plan)
  // If user is only team owner/admin, contain team members emails and ids (teams plan)
  const [userIdsWhereUserIsAdminOrOwner, userEmailsWhereUserIsAdminOrOwner] =
    userIdsAndEmailsWhereUserIsAdminOrOwner;

  // If userIds filter is provided
  if (!!filters?.userIds && filters.userIds.length > 0) {
    const areUserIdsWithinUserOrgOrTeam = filters.userIds.every((userId) =>
      userIdsWhereUserIsAdminOrOwner.includes(userId)
    );

    //  Scope depends on `user.orgId`:
    // - Throw an error if trying to filter by usersIds that are not within your ORG
    // - Throw an error if trying to filter by usersIds that are not within your TEAM
    if (!areUserIdsWithinUserOrgOrTeam) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permissions to fetch bookings for specified userIds",
      });
    }

    // 1. Booking created by one of the filtered users
    bookingQueries.push({
      query: kysely
        .selectFrom("Booking")
        .select("Booking.id")
        .select("Booking.startTime")
        .select("Booking.endTime")
        .select("Booking.createdAt")
        .select("Booking.updatedAt")
        .where("userId", "in", filters.userIds),
      tables: ["Booking"],
    });

    // 2. Attendee email matches one of the filtered users' emails
    if (attendeeEmailsFromUserIdsFilter?.length) {
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
          .where("Attendee.email", "in", attendeeEmailsFromUserIdsFilter),
        tables: ["Booking", "Attendee"],
      });
    }

    // 3. Seat reference attendee email matches one of the filtered users' emails
    if (attendeeEmailsFromUserIdsFilter?.length) {
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
          .innerJoin("BookingSeat", "Attendee.id", "BookingSeat.attendeeId")
          .where("Attendee.email", "in", attendeeEmailsFromUserIdsFilter),
        tables: ["Booking", "Attendee", "BookingSeat"],
      });
    }
  } else {
    // 1. Current user created bookings
    bookingQueries.push({
      query: kysely
        .selectFrom("Booking")
        .select("Booking.id")
        .select("Booking.startTime")
        .select("Booking.endTime")
        .select("Booking.createdAt")
        .select("Booking.updatedAt")
        .where("Booking.userId", "=", user.id),
      tables: ["Booking"],
    });
    // 2. Current user is an attendee
    bookingQueries.push({
      query: kysely
        .selectFrom("Booking")
        .select("Booking.id")
        .select("Booking.startTime")
        .select("Booking.endTime")
        .select("Booking.createdAt")
        .select("Booking.updatedAt")
        .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
        .where("Attendee.email", "=", user.email),
      tables: ["Booking", "Attendee"],
    });
    // 3. Current user is an attendee via seats reference
    bookingQueries.push({
      query: kysely
        .selectFrom("Booking")
        .select("Booking.id")
        .select("Booking.startTime")
        .select("Booking.endTime")
        .select("Booking.createdAt")
        .select("Booking.updatedAt")
        .innerJoin("BookingSeat", "BookingSeat.bookingId", "Booking.id")
        .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
        .where("Attendee.email", "=", user.email),
      tables: ["Booking", "Attendee", "BookingSeat"],
    });
    // 4. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN so we get bookings where organization members are attendees
    // - If Current user is TEAM_OWNER/ADMIN so we get bookings where team members are attendees
    userEmailsWhereUserIsAdminOrOwner?.length &&
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
          .where("Attendee.email", "in", userEmailsWhereUserIsAdminOrOwner),
        tables: ["Booking", "Attendee"],
      });
    // 5. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN so we get bookings where organization members are attendees via seatsReference
    // - If Current user is TEAM_OWNER/ADMIN so we get bookings where team members are attendees via seatsReference
    userEmailsWhereUserIsAdminOrOwner?.length &&
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
          .innerJoin("BookingSeat", "Attendee.id", "BookingSeat.attendeeId")
          .where("Attendee.email", "in", userEmailsWhereUserIsAdminOrOwner),
        tables: ["Booking", "Attendee", "BookingSeat"],
      });

    // 6. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN, get booking created for an event type within the organization
    // - If Current user is TEAM_OWNER/ADMIN, get bookings created for an event type within the team
    eventTypeIdsWhereUserIsAdminOrOwner?.length &&
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .innerJoin("EventType", "EventType.id", "Booking.eventTypeId")
          .where("Booking.eventTypeId", "in", eventTypeIdsWhereUserIsAdminOrOwner),
        tables: ["Booking", "EventType"],
      });

    // 7. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN, get bookings created by users within the same organization
    // - If Current user is TEAM_OWNER/ADMIN, get bookings created by users within the same organization
    userIdsWhereUserIsAdminOrOwner?.length &&
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .where("Booking.userId", "in", userIdsWhereUserIsAdminOrOwner),
        tables: ["Booking"],
      });
  }

  const queriesWithFilters = bookingQueries.map(({ query, tables }) => {
    // 1. Apply mandatory status filter
    let fullQuery = addStatusesQueryFilters(query, bookingListingByStatus);

    // 2. Filter by Event Type IDs derived from Team IDs (if provided)
    if (eventTypeIdsFromTeamIdsFilter && eventTypeIdsFromTeamIdsFilter.length > 0) {
      fullQuery = fullQuery.where("Booking.eventTypeId", "in", eventTypeIdsFromTeamIdsFilter);
    }

    // 3. Filter by specific Event Type IDs (if provided)
    // If both teamIds filter and eventTypeIds filter are provided, filter 2. ensures the event-types are within the teams
    if (eventTypeIdsFromEventTypeIdsFilter && eventTypeIdsFromEventTypeIdsFilter.length > 0) {
      fullQuery = fullQuery.where("Booking.eventTypeId", "in", eventTypeIdsFromEventTypeIdsFilter);
    }

    // 4. Filter by Attendee Name (if provided)
    if (filters?.attendeeName) {
      if (typeof filters.attendeeName === "string") {
        // Simple string match (exact)
        fullQuery = fullQuery
          .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
          .where("Attendee.name", "=", filters.attendeeName.trim());
      } else if (isTextFilterValue(filters.attendeeName)) {
        // TODO: write makeWhereClause equivalent for kysely
        fullQuery = addAdvancedAttendeeWhereClause(
          fullQuery,
          "name",
          filters.attendeeName.data.operator,
          filters.attendeeName.data.operand,
          tables.includes("Attendee")
        );
      }
    }

    // 5. Filter by Attendee Email (if provided)
    if (filters?.attendeeEmail) {
      if (typeof filters.attendeeEmail === "string") {
        // Simple string match (exact)
        fullQuery = fullQuery
          .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
          .where("Attendee.email", "=", filters.attendeeEmail.trim());
      } else if (isTextFilterValue(filters.attendeeEmail)) {
        // TODO: write makeWhereClause equivalent for kysely
        fullQuery = addAdvancedAttendeeWhereClause(
          fullQuery,
          "email",
          filters.attendeeEmail.data.operator,
          filters.attendeeEmail.data.operand,
          tables.includes("Attendee")
        );
      }
    }

    // 6. Filter by Booking Uid (if provided)
    if (filters?.bookingUid) {
      fullQuery = fullQuery.where("Booking.uid", "=", filters.bookingUid.trim());
    }

    // 7. Booking Start/End Time Range Filters
    if (filters?.afterStartDate) {
      fullQuery = fullQuery.where("Booking.startTime", ">=", dayjs.utc(filters.afterStartDate).toDate());
    }
    if (filters?.beforeEndDate) {
      fullQuery = fullQuery.where("Booking.endTime", "<=", dayjs.utc(filters.beforeEndDate).toDate());
    }

    return fullQuery;
  });

  const queryUnion = queriesWithFilters.reduce((acc, query) => {
    return acc.union(query);
  });

  const orderBy = getOrderBy(bookingListingByStatus, sort);

  const getBookingsUnionCompiled = kysely
    .selectFrom(queryUnion.as("union_subquery"))
    .selectAll("union_subquery")
    .$if(Boolean(filters?.afterUpdatedDate), (eb) =>
      eb.where("union_subquery.updatedAt", ">=", dayjs.utc(filters.afterUpdatedDate).toDate())
    )
    .$if(Boolean(filters?.beforeUpdatedDate), (eb) =>
      eb.where("union_subquery.updatedAt", "<=", dayjs.utc(filters.beforeUpdatedDate).toDate())
    )
    .$if(Boolean(filters?.afterCreatedDate), (eb) =>
      eb.where("union_subquery.createdAt", ">=", dayjs.utc(filters.afterCreatedDate).toDate())
    )
    .$if(Boolean(filters?.beforeCreatedDate), (eb) =>
      eb.where("union_subquery.createdAt", "<=", dayjs.utc(filters.beforeCreatedDate).toDate())
    )
    .orderBy(orderBy.key, orderBy.order)
    .limit(take)
    .offset(skip)
    .compile();

  const bookingsFromUnion = (await kysely.executeQuery(getBookingsUnionCompiled)).rows;

  log.debug(`Get bookings for user ${user.id} SQL:`, getBookingsUnionCompiled.sql);

  const totalCount = Number(
    (
      await kysely
        .selectFrom(queryUnion.as("union_subquery"))
        .select(({ fn }) => fn.countAll().as("bookingCount"))
        .executeTakeFirst()
    )?.bookingCount ?? 0
  );

  const plainBookings = !(bookingsFromUnion?.length === 0)
    ? await kysely
        .selectFrom("Booking")
        .where(
          "id",
          "in",
          bookingsFromUnion.map((booking) => booking.id)
        )
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
          sql`${eb.ref("startTime")} AT TIME ZONE 'UTC'`.as("startTimeUtc"),
          sql`${eb.ref("endTime")} AT TIME ZONE 'UTC'`.as("endTimeUtc"),
          eb
            .cast<Prisma.JsonValue>( // Target TypeScript type
              eb.ref("Booking.responses"), // Source column
              "jsonb" // Target SQL type
            )
            .as("responses"),
          "Booking.recurringEventId",
          "Booking.location",
          eb
            .cast<BookingStatus>(
              eb
                .case()
                .when("Booking.status", "=", "cancelled")
                .then(BookingStatus["CANCELLED"])
                .when("Booking.status", "=", "accepted")
                .then(BookingStatus["ACCEPTED"])
                .when("Booking.status", "=", "rejected")
                .then(BookingStatus["REJECTED"])
                .when("Booking.status", "=", "pending")
                .then(BookingStatus["PENDING"])
                .when("Booking.status", "=", "awaiting_host")
                .then(BookingStatus["AWAITING_HOST"])
                .else(BookingStatus["PENDING"])
                .end(), // End of CASE expression
              "varchar"
            )
            .as("status"),
          "Booking.paid",
          "Booking.fromReschedule",
          "Booking.rescheduled",
          "Booking.isRecorded",
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
                "EventType.userId",
                "EventType.title",
                "EventType.eventName",
                "EventType.price",
                "EventType.recurringEvent",
                "EventType.currency",
                "EventType.metadata",
                "EventType.disableGuests",
                "EventType.seatsShowAttendees",
                "EventType.seatsPerTimeSlot",
                "EventType.seatsShowAvailabilityCount",
                "EventType.eventTypeColor",
                "EventType.customReplyToEmail",
                "EventType.bookingFields",
                "EventType.allowReschedulingPastBookings",
                "EventType.hideOrganizerEmail",
                "EventType.disableCancelling",
                "EventType.disableRescheduling",
                eb
                  .cast<SchedulingType | null>(
                    eb
                      .case()
                      .when("EventType.schedulingType", "=", "roundRobin")
                      .then(SchedulingType["ROUND_ROBIN"])
                      .when("EventType.schedulingType", "=", "collective")
                      .then(SchedulingType["COLLECTIVE"])
                      .when("EventType.schedulingType", "=", "managed")
                      .then(SchedulingType["MANAGED"])
                      .else(null)
                      .end(),
                    "varchar" // Or 'text' - use the actual SQL data type
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
                    .selectFrom("CalIdTeam")
                    .select(["CalIdTeam.id", "CalIdTeam.name", "CalIdTeam.slug"])
                    .whereRef("EventType.calIdTeamId", "=", "CalIdTeam.id")
                ).as("calIdTeam"),
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
              .select(["Payment.paymentOption", "Payment.amount", "Payment.currency", "Payment.success"])
              .whereRef("Payment.bookingId", "=", "Booking.id")
          ).as("payment"),
          jsonObjectFrom(
            eb
              .selectFrom("users")
              .select(["users.id", "users.name", "users.email", "users.username"])
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
                    .select(["Attendee.email", "Attendee.name", "Attendee.timeZone"])
                    .whereRef("BookingSeat.attendeeId", "=", "Attendee.id")
                ).as("attendee"),
                jsonArrayFrom(
                  eb
                    .selectFrom("Payment")
                    .select(["Payment.success", "Payment.amount", "Payment.currency"])
                    .whereRef("Payment.bookingSeatId", "=", "BookingSeat.id")
                ).as("payment"),
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
        ])
        .orderBy(orderBy.key, orderBy.order)
        .execute()
    : [];

  //NEW:  Building recurringInfo from RFC 5545 metadata instead of recurringEventId
  // now exdates are used to track cancelled occurrences
  const recurringInfo = plainBookings
    .filter((booking) => {
      const metadata = booking.metadata as Record<string, any> | null;
      return metadata?.recurringEvent;
    })
    .map((booking) => {
      const metadata = booking.metadata as Record<string, any>;
      const recurringEvent = metadata.recurringEvent;
      const utcStartTime = booking.startTimeUtc as Date;

      // Generate occurrences using RRule, with cancelled dates tracked separately
      const { occurrences, cancelledDates } = generateOccurrencesFromRRule(recurringEvent, utcStartTime);

      // Group occurrences by status
      const bookingsByStatus: {
        CANCELLED: Date[];
        ACCEPTED: Date[];
        REJECTED: Date[];
        PENDING: Date[];
        AWAITING_HOST: Date[];
      } = {
        CANCELLED: cancelledDates, // Start with exDates as cancelled
        ACCEPTED: [],
        REJECTED: [],
        PENDING: [],
        AWAITING_HOST: [],
      };

      // All other occurrences share the same status as the parent booking
      const status = booking.status as BookingStatus;
      if (status in bookingsByStatus) {
        bookingsByStatus[status] = occurrences;
      }

      return {
        recurringEventId: booking.uid, // Use booking UID as identifier
        count: occurrences.length + cancelledDates.length, // Include cancelled in total count
        firstDate: occurrences[0] || cancelledDates[0] || null,
        bookings: bookingsByStatus,
      };
    });

  // Now enrich bookings with relation data. We could have queried the relation data along with the bookings, but that would cause unnecessary queries to the database.
  // Because Prisma is also going to query the select relation data sequentially, we are fine querying it separately here as it would be just 1 query instead of 4
  log.info(
    `fetching all bookings for ${user.id}`,
    safeStringify({
      ids: plainBookings.map((booking) => booking.id),
      filters,
      orderBy,
      take,
      skip,
    })
  );

  const checkIfUserIsHost = (userId: number, booking: (typeof plainBookings)[number]) => {
    if (booking.user?.id === userId) {
      return true;
    }

    if (!booking.eventType?.hosts || booking.eventType.hosts.length === 0) {
      return false;
    }

    const attendeeEmails = new Set(booking.attendees.map((attendee) => attendee.email));

    return booking.eventType.hosts.some(({ user: hostUser }) => {
      return hostUser?.id === userId && attendeeEmails.has(hostUser.email);
    });
  };
  const bookings = await Promise.all(
    plainBookings.map(async (booking) => {
      // If seats are enabled, the event is not set to show attendees, and the current user is not the host, filter out attendees who are not the current user
      if (
        booking.seatsReferences.length &&
        !booking.eventType?.seatsShowAttendees &&
        !checkIfUserIsHost(user.id, booking)
      ) {
        booking.attendees = booking.attendees.filter((attendee) => attendee.email === user.email);
      }

      let rescheduler = null;
      if (booking.fromReschedule) {
        const rescheduledBooking = await prisma.booking.findUnique({
          where: {
            uid: booking.fromReschedule,
          },
          select: {
            rescheduledBy: true,
          },
        });
        if (rescheduledBooking) {
          rescheduler = rescheduledBooking.rescheduledBy;
        }
      }

      return {
        ...booking,
        customInputs: booking.customInputs as Record<string, any> | null,
        rescheduler,
        eventType: {
          ...booking.eventType,
          recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
          eventTypeColor: parseEventTypeColor(booking.eventType?.eventTypeColor),
          price: booking.eventType?.price || 0,
          currency: booking.eventType?.currency || "usd",
          metadata: EventTypeMetaDataSchema.parse(booking.eventType?.metadata || {}) as Record<string, any>,
        },
        startTime: booking.startTimeUtc.toISOString(),
        endTime: booking.endTimeUtc.toISOString(),
        metadata: (booking.metadata ?? null) as Record<string, any> | null,
      };
    })
  );
  return { bookings, recurringInfo, totalCount };
}

async function getEventTypeIdsFromTeamIdsFilter(prisma: PrismaClient, teamIds?: number[]) {
  if (!teamIds || teamIds.length === 0) {
    return undefined;
  }

  const [directTeamEventTypeIds, parentTeamEventTypeIds] = await Promise.all([
    prisma.eventType
      .findMany({
        where: {
          calIdTeamId: { in: teamIds },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),

    prisma.eventType
      .findMany({
        where: {
          parent: {
            calIdTeamId: { in: teamIds },
          },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),
  ]);

  return Array.from(new Set([...directTeamEventTypeIds, ...parentTeamEventTypeIds]));
}

async function getAttendeeEmailsFromUserIdsFilter(
  prisma: PrismaClient,
  userEmail: string,
  userIds?: number[]
) {
  if (!userIds || userIds.length === 0) {
    return;
  }

  const attendeeEmailsFromUserIdsFilter = await prisma.user
    .findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        email: true,
      },
    })
    .then((users) => users.map((user) => user.email));

  if (!attendeeEmailsFromUserIdsFilter || attendeeEmailsFromUserIdsFilter?.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The requested users do not exist.",
    });
  }

  return attendeeEmailsFromUserIdsFilter;
}

async function getEventTypeIdsFromEventTypeIdsFilter(prisma: PrismaClient, eventTypeIds?: number[]) {
  if (!eventTypeIds || eventTypeIds.length === 0) {
    return undefined;
  }
  const [directEventTypeIds, parentEventTypeIds] = await Promise.all([
    prisma.eventType
      .findMany({
        where: {
          id: { in: eventTypeIds },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),

    prisma.eventType
      .findMany({
        where: {
          parent: {
            id: {
              in: eventTypeIds,
            },
          },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),
  ]);

  const eventTypeIdsFromDb = Array.from(new Set([...directEventTypeIds, ...parentEventTypeIds]));

  if (eventTypeIdsFromDb?.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The requested event-types do not exist.",
    });
  }

  return eventTypeIdsFromDb;
}

async function getEventTypeIdsWhereUserIsAdminOrOwner(
  prisma: PrismaClient,
  membershipCondition: PrismaClientType.CalIdMembershipListRelationFilter
) {
  const [directTeamEventTypeIds, parentTeamEventTypeIds] = await Promise.all([
    prisma.eventType
      .findMany({
        where: {
          calIdTeam: {
            members: membershipCondition,
          },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),

    prisma.eventType
      .findMany({
        where: {
          parent: {
            calIdTeam: {
              members: membershipCondition,
            },
          },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),
  ]);

  return Array.from(new Set([...directTeamEventTypeIds, ...parentTeamEventTypeIds]));
}

/**
 * Gets [IDs, Emails] of members where the auth user is team/org admin/owner.
 * @param prisma The Prisma client.
 * @param membershipCondition Filter containing the team/org ids where user is ADMIN/OWNER
 * @returns {Promise<[number[], string[]]>} [UserIDs, UserEmails] for members in the determined scope.
 */
async function getUserIdsAndEmailsWhereUserIsAdminOrOwner(
  prisma: PrismaClient,
  membershipCondition: PrismaClientType.CalIdMembershipListRelationFilter
): Promise<[number[], string[]]> {
  const users = await prisma.user.findMany({
    where: {
      calIdTeams: {
        some: {
          calIdTeam: {
            members: membershipCondition,
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  });
  const userIds = Array.from(new Set(users.map((user) => user.id)));
  const userEmails = Array.from(new Set(users.map((user) => user.email)));

  return [userIds, userEmails];
}

function addStatusesQueryFilters(query: BookingsUnionQuery, statuses: InputByStatus[]) {
  if (statuses?.length) {
    return query.where(({ eb, or, and }) =>
      or(
        statuses.map((status) => {
          if (status === "upcoming") {
            return and([
              eb(sql`"Booking"."endTime" AT TIME ZONE 'UTC'`, ">=", new Date()),
              // or([
              //   and([eb("Booking.recurringEventId", "is not", null), eb("Booking.status", "=", "accepted")]),
              //   and([
              eb("Booking.recurringEventId", "is", null),
              eb("Booking.status", "not in", ["cancelled", "rejected", "pending"]),
              //   ]),
              // ]),
            ]);
          }

          if (status === "recurring") {
            return and([
              // eb(sql`"Booking"."endTime" AT TIME ZONE 'UTC'`, ">=", new Date()),
              eb(sql`"Booking"."metadata"->>'recurringEvent'`, "is not", null),
              eb("Booking.status", "not in", ["cancelled", "rejected"]),
            ]);
          }

          if (status === "past") {
            return and([
              eb(sql`"Booking"."endTime" AT TIME ZONE 'UTC'`, "<=", new Date()),
              eb("Booking.status", "not in", ["cancelled", "rejected"]),
            ]);
          }

          if (status === "cancelled") {
            return eb("Booking.status", "in", ["cancelled", "rejected"]);
          }

          if (status === "unconfirmed") {
            return and([
              eb(sql`"Booking"."endTime" AT TIME ZONE 'UTC'`, ">=", new Date()),
              eb("Booking.status", "=", "pending"),
            ]);
          }
          return and([]);
        })
      )
    );
  }

  return query;
}

function addAdvancedAttendeeWhereClause(
  query: BookingsUnionQuery,
  key: "name" | "email",
  operator:
    | "endsWith"
    | "startsWith"
    | "equals"
    | "notEquals"
    | "contains"
    | "notContains"
    | "isEmpty"
    | "isNotEmpty",
  operand: string,
  isAttendeeTableJoined: boolean
) {
  let fullQuery = query.$if(!isAttendeeTableJoined, (eb) =>
    eb.innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
  ) as SelectQueryBuilder<
    DB,
    "Booking" | "Attendee",
    Pick<Booking, "id" | "createdAt" | "updatedAt" | "startTime" | "endTime">
  >;

  switch (operator) {
    case "endsWith":
      fullQuery = fullQuery.where(`Attendee.${key}`, "ilike", `%${operand}`);
      break;

    case "startsWith":
      fullQuery = fullQuery.where(`Attendee.${key}`, "ilike", `${operand}%`);
      break;

    case "equals":
      fullQuery = fullQuery.where((eb) =>
        eb(eb.fn<string>("lower", [`Attendee.${key}`]), "=", `${operand.toLowerCase()}`)
      );
      break;

    case "notEquals":
      fullQuery = fullQuery.where((eb) =>
        eb(eb.fn<string>("lower", [`Attendee.${key}`]), "!=", `${operand.toLowerCase()}`)
      );
      break;

    case "contains":
      fullQuery = fullQuery.where(`Attendee.${key}`, "ilike", `%${operand}%`);
      break;

    case "notContains":
      fullQuery = fullQuery.where(`Attendee.${key}`, "not ilike", `%${operand}%`);
      break;

    case "isEmpty":
      fullQuery = fullQuery.where(`Attendee.${key}`, "=", "");
      break;

    case "isNotEmpty":
      fullQuery = fullQuery.where(`Attendee.${key}`, "!=", "");
      break;

    default:
      break;
  }

  return fullQuery;
}

function getOrderBy(
  bookingListingByStatus: InputByStatus[],
  sort?: {
    sortStart?: "asc" | "desc";
    sortEnd?: "asc" | "desc";
    sortCreated?: "asc" | "desc";
    sortUpdated?: "asc" | "desc";
  }
): { key: "startTime" | "endTime" | "createdAt" | "updatedAt"; order: "desc" | "asc" } {
  const bookingListingOrderby = {
    upcoming: { startTime: "asc" },
    recurring: { startTime: "asc" },
    past: { startTime: "desc" },
    cancelled: { startTime: "desc" },
    unconfirmed: { startTime: "asc" },
  } as const;

  if (bookingListingByStatus?.length === 1 && !sort) {
    return { key: "startTime", order: bookingListingOrderby[bookingListingByStatus[0]].startTime };
  }

  if (sort?.sortStart) {
    return { key: "startTime", order: sort.sortStart };
  }
  if (sort?.sortEnd) {
    return { key: "endTime", order: sort.sortEnd };
  }
  if (sort?.sortCreated) {
    return { key: "createdAt", order: sort.sortCreated };
  }
  if (sort?.sortUpdated) {
    return { key: "updatedAt", order: sort.sortUpdated };
  }

  return { key: "startTime", order: "asc" };
}
