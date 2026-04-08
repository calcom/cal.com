import dayjs from "@calcom/dayjs";
import getAllUserBookings from "@calcom/features/bookings/lib/getAllUserBookings";
import { sanitizeOrganizerEmailFields } from "@calcom/features/bookings/lib/sanitize-organizer-email-fields";
import { isTextFilterValue } from "@calcom/features/data-table/lib/utils";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { DB } from "@calcom/kysely";
import kysely from "@calcom/kysely";
import { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import type { Booking, Prisma as PrismaClientType } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@trpc/server";
import type { ExpressionBuilder, Kysely, SelectQueryBuilder } from "kysely";
import { sql } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
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
  // Support both offset-based (list) and cursor-based pagination (calendar)
  // Cursor is just the offset as a string (fake cursor pagination)
  const take = input.limit;
  let skip = input.offset;

  // If cursor is provided, parse it to get the offset
  if (input.cursor) {
    const parsedCursor = parseInt(input.cursor, 10);
    if (!isNaN(parsedCursor) && parsedCursor >= 0) {
      skip = parsedCursor;
    }
  }

  const { prisma, user } = ctx;
  const defaultStatus = "upcoming";

  const bookingListingByStatus = input.filters.statuses?.length
    ? input.filters.statuses
    : [input.filters.status || defaultStatus];

  const { bookings, recurringInfo, totalCount, hasMore } = await getAllUserBookings({
    ctx: {
      user: { id: user.id, email: user.email, orgId: user?.profile?.organizationId },
      prisma: prisma,
      kysely: kysely,
    },
    bookingListingByStatus: bookingListingByStatus,
    take,
    skip,
    filters: input.filters,
    sort: input.sort,
    requireExactCount: input.requireExactCount,
  });

  const nextOffset = skip + take;
  const nextCursor = hasMore ? nextOffset.toString() : undefined;

  return {
    bookings,
    recurringInfo,
    nextCursor,
    totalCount,
    hasMore: hasMore ?? false,
  };
};

type BookingsUnionQuery = SelectQueryBuilder<
  DB,
  "Booking",
  Pick<Booking, "id" | "createdAt" | "updatedAt" | "startTime" | "endTime">
>;

type GetBookingsBaseParams = {
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
};

export async function getBookings({
  user,
  prisma,
  kysely,
  bookingListingByStatus,
  sort,
  filters,
  take,
  skip,
  requireExactCount = false,
}: GetBookingsBaseParams & { requireExactCount?: boolean }) {
  const permissionCheckService = new PermissionCheckService();
  const fallbackRoles: MembershipRole[] = [MembershipRole.ADMIN, MembershipRole.OWNER];

  const teamIdsWithBookingPermission = await permissionCheckService.getTeamIdsWithPermission({
    userId: user.id,
    permission: "booking.read",
    fallbackRoles,
    orgId: user.orgId ?? undefined,
  });

  // Only fetch user IDs from teams if we need to validate userIds filter
  // PERFORMANCE: We no longer need to fetch all emails/IDs for the main query since we use subqueries
  const needsUserIdsValidation = !!filters?.userIds && filters.userIds.length > 0;

  const [
    eventTypeIdsFromTeamIdsFilter,
    attendeeEmailsFromUserIdsFilter,
    eventTypeIdsFromEventTypeIdsFilter,
    allAccessibleUserIds,
  ] = await Promise.all([
    getEventTypeIdsFromTeamIdsFilter(prisma, filters?.teamIds),
    getAttendeeEmailsFromUserIdsFilter(prisma, user.email, filters?.userIds),
    getEventTypeIdsFromEventTypeIdsFilter(prisma, filters?.eventTypeIds),
    // Only fetch accessible user IDs when we need to validate the userIds filter
    needsUserIdsValidation
      ? getUserIdsFromTeamIds(prisma, teamIdsWithBookingPermission)
      : Promise.resolve([]),
  ]);

  const bookingQueries: { query: BookingsUnionQuery; tables: (keyof DB)[] }[] = [];

  // If userIds filter is provided
  if (!!filters?.userIds && filters.userIds.length > 0) {
    const areUserIdsWithinUserOrgOrTeam = filters.userIds.every((userId) =>
      allAccessibleUserIds.includes(userId)
    );

    const isCurrentUser = filters.userIds.length === 1 && user.id === filters.userIds[0];

    //  Scope depends on `user.orgId`:
    // - Throw an error if trying to filter by usersIds that are not within your ORG
    // - Throw an error if trying to filter by usersIds that are not within your TEAM
    if (!areUserIdsWithinUserOrgOrTeam && !isCurrentUser) {
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
    // - If Current user is ORG_OWNER/ADMIN or has booking.read permission, get bookings where organization/team members are attendees
    // PERFORMANCE: Use subquery with team membership instead of materializing all emails (can be 400+ for large orgs)
    if (teamIdsWithBookingPermission?.length) {
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
          .where("Attendee.email", "in", (eb) =>
            eb
              .selectFrom("users")
              .select("users.email")
              .innerJoin("Membership", "Membership.userId", "users.id")
              .where("Membership.teamId", "in", teamIdsWithBookingPermission)
          ),
        tables: ["Booking", "Attendee"],
      });
    }
    // 5. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN or has booking.read permission, get bookings where organization/team members are attendees via seatsReference
    // PERFORMANCE: Use subquery with team membership instead of materializing all emails
    if (teamIdsWithBookingPermission?.length) {
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
          .where("Attendee.email", "in", (eb) =>
            eb
              .selectFrom("users")
              .select("users.email")
              .innerJoin("Membership", "Membership.userId", "users.id")
              .where("Membership.teamId", "in", teamIdsWithBookingPermission)
          ),
        tables: ["Booking", "Attendee", "BookingSeat"],
      });
    }

    // 6. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN or has booking.read permission, get booking created for an event type within the organization/team
    // PERFORMANCE: Use subquery to get event type IDs instead of materializing them
    if (teamIdsWithBookingPermission?.length) {
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .where("Booking.eventTypeId", "in", (eb) =>
            eb
              .selectFrom("EventType")
              .select("EventType.id")
              .where("EventType.teamId", "in", teamIdsWithBookingPermission)
          ),
        tables: ["Booking"],
      });
    }

    // 7. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN or has booking.read permission, get bookings created by users within the same organization/team
    // PERFORMANCE: Use subquery with team membership instead of materializing all user IDs
    if (teamIdsWithBookingPermission?.length) {
      bookingQueries.push({
        query: kysely
          .selectFrom("Booking")
          .select("Booking.id")
          .select("Booking.startTime")
          .select("Booking.endTime")
          .select("Booking.createdAt")
          .select("Booking.updatedAt")
          .where("Booking.userId", "in", (eb) =>
            eb
              .selectFrom("Membership")
              .select("Membership.userId")
              .where("Membership.teamId", "in", teamIdsWithBookingPermission)
          ),
        tables: ["Booking"],
      });
    }
  }

  const orderBy = getOrderBy(bookingListingByStatus, sort);

  function buildQuery(opts?: {
    pastWindow?: { startTimeAfter: Date; startTimeBefore?: Date };
    limit?: number;
    offset?: number;
  }) {
    const queriesWithFilters = bookingQueries.map(({ query, tables }) => {
      // 1. Apply mandatory status filter
      let fullQuery = addStatusesQueryFilters(query, bookingListingByStatus, opts?.pastWindow);

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
      return acc.unionAll(query);
    });

    let outerQuery = kysely
      .selectFrom(queryUnion.as("union_subquery"))
      .distinct()
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
      .orderBy(orderBy.key, orderBy.order);

    if (opts?.limit !== undefined) {
      outerQuery = outerQuery.limit(opts.limit);
    }
    if (opts?.offset !== undefined) {
      outerQuery = outerQuery.offset(opts.offset);
    }

    return { compiled: outerQuery.compile(), queryUnion };
  }

  const isPastQuery = bookingListingByStatus.length === 1 && bookingListingByStatus[0] === "past";

  let bookingsFromUnion: Pick<Booking, "id" | "createdAt" | "updatedAt" | "startTime" | "endTime">[];

  // Fetch take + 1 rows to determine hasNextPage without a count query.
  // The extra row is stripped before returning results.
  const fetchLimit = take + 1;

  if (isPastQuery) {
    // Progressive window: start narrow (1 week), widen until we have enough results.
    // Each subsequent query only fetches the gap between the previous window boundary
    // and the new one, so we never re-scan rows we've already seen.
    //
    // We fetch skip + fetchLimit total rows without SQL OFFSET, then discard the first
    // `skip` in memory. This is necessary because offset-based pagination can't be
    // split across independent window queries (window 1 might have fewer rows than skip).
    const now = new Date();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    // 1w, 4w (~1mo), 12w (~3mo), 48w (~1yr), unbounded
    const windowMultipliers: (number | null)[] = [1, 4, 12, 48, null];
    const needed = skip + fetchLimit;

    const allRows: typeof bookingsFromUnion = [];
    let previousBoundary: Date | undefined;

    for (const multiplier of windowMultipliers) {
      const startTimeAfter = multiplier ? new Date(now.getTime() - multiplier * ONE_WEEK_MS) : new Date(0);

      const remaining = needed - allRows.length;

      const { compiled } = buildQuery({
        pastWindow: { startTimeAfter, startTimeBefore: previousBoundary },
        limit: remaining,
      });

      const windowRows = (await kysely.executeQuery(compiled)).rows;
      allRows.push(...windowRows);

      log.debug(
        `Past bookings window (${multiplier ? multiplier + "w" : "all"}): got ${windowRows.length} rows, total ${allRows.length}/${needed}`
      );

      if (allRows.length >= needed) break;
      previousBoundary = startTimeAfter;
    }

    bookingsFromUnion = allRows.slice(skip, skip + fetchLimit);
  } else {
    const { compiled } = buildQuery({ limit: fetchLimit, offset: skip });
    bookingsFromUnion = (await kysely.executeQuery(compiled)).rows;
  }

  // Determine hasNextPage from the extra row, then trim to the requested page size.
  const hasNextPage = bookingsFromUnion.length > take;
  if (hasNextPage) {
    bookingsFromUnion = bookingsFromUnion.slice(0, take);
  }

  log.debug(`Get bookings for user ${user.id}`);

  const hasTeamAccess = !!teamIdsWithBookingPermission?.length;

  // totalCount derivation:
  //   - Page not full: derived for free (skip + rows)
  //   - requireExactCount (API): always compute via fast count
  //   - Personal bookings: compute via fast count (cheap)
  //   - Team bookings without requireExactCount: skip (expensive)
  let totalCount: number | null = null;

  if (!hasNextPage) {
    totalCount = skip + bookingsFromUnion.length;
  } else if (requireExactCount || !hasTeamAccess) {
    {
      const { queryUnion: countQueryUnion } = buildQuery();
      const fastCount = await getFastExactCount({
        kysely,
        user,
        bookingListingByStatus,
        filters,
        eventTypeIdsFromTeamIdsFilter,
        eventTypeIdsFromEventTypeIdsFilter,
        teamIdsWithBookingPermission,
      });
      if (fastCount !== null) {
        totalCount = fastCount;
      } else {
        totalCount = Number(
          (
            await kysely
              .selectFrom(countQueryUnion.as("union_subquery"))
              .select(({ fn }) => fn.count("union_subquery.id").distinct().as("bookingCount"))
              .executeTakeFirst()
          )?.bookingCount ?? 0
        );
      }
    }
  }

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
          eb
            .cast<Prisma.JsonValue>(
              // Target TypeScript type
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
                .end(), // End of CASE expression
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
                "EventType.disableCancellingScope",
                "EventType.disableRescheduling",
                "EventType.disableReschedulingScope",
                "EventType.disableReassignment",
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
              .orderBy("AssignmentReason.createdAt", "asc")
          ).as("assignmentReasonSortedByCreatedAt"),
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
        .execute()
    : [];

  const [
    recurringInfoBasic,
    recurringInfoExtended,
    // We need all promises to be successful, so we are not using Promise.allSettled
  ] = await Promise.all([
    prisma.booking.groupBy({
      by: ["recurringEventId"],
      _min: {
        startTime: true,
      },
      _count: {
        recurringEventId: true,
      },
      where: {
        recurringEventId: {
          not: { equals: null },
        },
        userId: user.id,
      },
    }),
    prisma.booking.groupBy({
      by: ["recurringEventId", "status", "startTime"],
      _min: {
        startTime: true,
      },
      where: {
        recurringEventId: {
          not: { equals: null },
        },
        userId: user.id,
      },
    }),
  ]);

  const recurringInfo = recurringInfoBasic.map(
    (
      info: (typeof recurringInfoBasic)[number]
    ): {
      recurringEventId: string | null;
      count: number;
      firstDate: Date | null;
      bookings: {
        [key: string]: Date[];
      };
    } => {
      const bookings = recurringInfoExtended.reduce(
        (prev, curr) => {
          if (curr.recurringEventId === info.recurringEventId) {
            prev[curr.status].push(curr.startTime);
          }
          return prev;
        },
        { ACCEPTED: [], CANCELLED: [], REJECTED: [], PENDING: [], AWAITING_HOST: [] } as {
          [key in BookingStatus]: Date[];
        }
      );
      return {
        recurringEventId: info.recurringEventId,
        count: info._count.recurringEventId,
        firstDate: info._min.startTime,
        bookings,
      };
    }
  );

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

      // Filter out organizer information if hideOrganizerEmail is true
      const isHost = checkIfUserIsHost(user.id, booking);
      const isTeamMember =
        !!booking.eventType?.teamId && teamIdsWithBookingPermission.includes(booking.eventType.teamId);
      const canViewHiddenData = isHost || isTeamMember;
      if (booking.eventType?.hideOrganizerEmail && !canViewHiddenData) {
        const sanitized = sanitizeOrganizerEmailFields({
          organizerEmails: [booking.userPrimaryEmail, booking.user?.email],
          cancelledBy: booking.cancelledBy,
          rescheduledBy: booking.rescheduledBy,
        });
        booking.cancelledBy = sanitized.cancelledBy;
        booking.rescheduledBy = sanitized.rescheduledBy;

        const sanitizedRescheduler = sanitizeOrganizerEmailFields({
          organizerEmails: [booking.userPrimaryEmail, booking.user?.email],
          cancelledBy: null,
          rescheduledBy: rescheduler,
        });
        rescheduler = sanitizedRescheduler.rescheduledBy;
      }

      return {
        ...booking,
        rescheduler,
        eventType: {
          ...booking.eventType,
          recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
          eventTypeColor: parseEventTypeColor(booking.eventType?.eventTypeColor),
          price: booking.eventType?.price || 0,
          currency: booking.eventType?.currency || "usd",
          metadata: EventTypeMetaDataSchema.parse(booking.eventType?.metadata || {}),
        },
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
      };
    })
  );

  // Enrich attendees with user data
  const enrichedBookings = await enrichAttendeesWithUserData(bookings, kysely);

  return {
    bookings: enrichedBookings,
    recurringInfo,
    hasMore: hasNextPage || undefined,
    totalCount,
  };
}

type EnrichedUserData = {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  username: string | null;
};

/**
 * Enriches booking attendees with user data by performing a left outer join
 * between attendees and users tables on email addresses.
 *
 * @param bookings - Array of bookings with attendees to enrich
 * @param kysely - Kysely database client instance
 * @returns Bookings with attendees enriched with user data (name, email, avatarUrl, username)
 */
async function enrichAttendeesWithUserData<
  TBooking extends { attendees: ReadonlyArray<{ id: number; email: string }> },
>(
  bookings: TBooking[],
  kysely: Kysely<DB>
): Promise<
  Array<
    Omit<TBooking, "attendees"> & {
      attendees: Array<TBooking["attendees"][number] & { user: EnrichedUserData | null }>;
    }
  >
> {
  // Extract all unique attendee emails from bookings
  const allAttendees = bookings.flatMap((booking) => booking.attendees);
  const uniqueAttendeeIds = Array.from(new Set(allAttendees.map((attendee) => attendee.id)));

  // Query attendees with left join to users table
  const enrichedAttendees =
    uniqueAttendeeIds.length > 0
      ? await kysely
          .selectFrom("Attendee")
          .leftJoin("users", "users.email", "Attendee.email")
          .select(["Attendee.id", "users.name", "Attendee.email", "users.avatarUrl", "users.username"])
          .where("Attendee.id", "in", uniqueAttendeeIds)
          .execute()
      : [];

  // Create a lookup map for O(1) access by attendee ID
  const attendeeUserDataMap = new Map<number, EnrichedUserData>(
    enrichedAttendees.map((enriched) => [
      enriched.id,
      {
        name: enriched.name,
        email: enriched.email,
        avatarUrl: enriched.avatarUrl,
        username: enriched.username,
      },
    ])
  );

  // Map over bookings and enrich each attendee with user data
  return bookings.map((booking) => ({
    ...booking,
    attendees: booking.attendees.map((attendee) => ({
      ...attendee,
      user: attendeeUserDataMap.get(attendee.id) || null,
    })),
  }));
}

/**
 * Gets event type IDs for the given team IDs using an optimized raw SQL query.
 *
 * This query uses a UNION to combine:
 * 1. Child event types whose parent belongs to the specified teams (managed event types)
 * 2. Direct team event types that belong to the specified teams
 *
 * The subquery structure `WHERE "parent"."id" IN (SELECT "id" FROM "EventType" WHERE "teamId" IN (...)))`
 * is intentional - it allows PostgreSQL to use the composite index on EventType(parentId, teamId)
 * efficiently via Nested Loop joins, resulting in ~66x faster execution compared to a direct
 * WHERE clause on parent.teamId (2.46ms vs 164ms in production benchmarks).
 *
 * @param prisma The Prisma client
 * @param teamIds Array of team IDs to filter by
 * @returns Array of event type IDs or undefined if no teamIds provided
 */
async function getEventTypeIdsFromTeamIdsFilter(prisma: PrismaClient, teamIds?: number[]) {
  if (!teamIds || teamIds.length === 0) {
    return undefined;
  }

  const result = await prisma.$queryRaw<{ id: number }[]>`
    SELECT "child"."id"
    FROM "public"."EventType" AS "parent"
    LEFT JOIN "public"."EventType" "child" ON ("parent"."id") = ("child"."parentId")
    WHERE "parent"."id" IN (SELECT "id" FROM "public"."EventType" WHERE "teamId" IN (${Prisma.join(teamIds)}))
      AND "child"."id" IS NOT NULL
    UNION
    SELECT "parent"."id"
    FROM "public"."EventType" AS "parent"
    WHERE "parent"."teamId" IN (${Prisma.join(teamIds)})
  `;

  return result.map((row) => row.id);
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

/**
 * Gets user IDs of members from specified team IDs.
 * PERFORMANCE: This is a lighter version that only fetches IDs (not emails) for permission validation.
 * @param prisma The Prisma client.
 * @param teamIds Array of team IDs to get members from
 * @returns {Promise<number[]>} UserIDs for members in the specified teams.
 */
async function getUserIdsFromTeamIds(prisma: PrismaClient, teamIds: number[]): Promise<number[]> {
  if (teamIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      teams: {
        some: {
          teamId: {
            in: teamIds,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  return Array.from(new Set(users.map((user) => user.id)));
}

/**
 * Fast exact count for personal bookings (no team access).
 *
 * Instead of COUNT(DISTINCT id) over a 3-branch UNION ALL, this runs two
 * simpler queries that each hit a single index:
 *
 * 1. COUNT(*) on Booking where userId = :id  (organizer bookings)
 * 2. COUNT(*) on Booking JOIN Attendee where email = :email AND userId != :id
 *    (attendee-only bookings, excluding already-counted organizer ones)
 *
 * The sum gives the exact total. Branch 3 (seated attendee) is a subset of
 * branch 2 — same Attendee.email filter — so it doesn't need a separate count.
 *
 * Returns null when the fast path can't be used (complex filters active),
 * signalling the caller to fall back to the UNION-based count.
 */
/**
 * Fast exact count that avoids COUNT(DISTINCT) over the full UNION ALL.
 *
 * Personal bookings (no team access): two parallel queries:
 *   1. COUNT(*) WHERE userId = :id  (organizer)
 *   2. COUNT(DISTINCT id) JOIN Attendee WHERE email = :email AND userId != :id
 *      (attendee-only, excludes organizer dupes)
 *
 * Team access: single query using EXISTS to deduplicate without UNION:
 *   COUNT(*) FROM Booking WHERE
 *     userId IN (team members via Membership subquery)
 *     OR eventTypeId IN (team event types via EventType subquery)
 *     OR EXISTS (Attendee with email in team member emails via Membership subquery)
 *
 * Returns null when filters prevent the fast path (attendeeName, attendeeEmail,
 * bookingUid, userIds), signalling the caller to fall back to the UNION count.
 */
async function getFastExactCount({
  kysely: db,
  user,
  bookingListingByStatus,
  filters,
  eventTypeIdsFromTeamIdsFilter,
  eventTypeIdsFromEventTypeIdsFilter,
  teamIdsWithBookingPermission,
}: {
  kysely: Kysely<DB>;
  user: { id: number; email: string };
  bookingListingByStatus: InputByStatus[];
  filters: TGetInputSchema["filters"];
  eventTypeIdsFromTeamIdsFilter: number[] | undefined;
  eventTypeIdsFromEventTypeIdsFilter: number[] | undefined;
  teamIdsWithBookingPermission: number[] | undefined;
}): Promise<number | null> {
  // Bail out when filters change which bookings match in ways we can't decompose.
  if (filters?.attendeeName || filters?.attendeeEmail || filters?.bookingUid) {
    return null;
  }
  if (filters?.userIds?.length) {
    return null;
  }

  type CountQuery = SelectQueryBuilder<DB, "Booking", { id: number }>;

  function applyCountFilters(query: CountQuery): CountQuery {
    return query
      .$if(bookingListingByStatus.length > 0, (qb) =>
        qb.where(buildStatusWhereClause(bookingListingByStatus))
      )
      .$if(!!eventTypeIdsFromTeamIdsFilter?.length, (qb) =>
        qb.where("Booking.eventTypeId", "in", eventTypeIdsFromTeamIdsFilter!)
      )
      .$if(!!eventTypeIdsFromEventTypeIdsFilter?.length, (qb) =>
        qb.where("Booking.eventTypeId", "in", eventTypeIdsFromEventTypeIdsFilter!)
      )
      .$if(!!filters?.afterStartDate, (qb) =>
        qb.where("Booking.startTime", ">=", dayjs.utc(filters!.afterStartDate).toDate())
      )
      .$if(!!filters?.beforeEndDate, (qb) =>
        qb.where("Booking.endTime", "<=", dayjs.utc(filters!.beforeEndDate).toDate())
      )
      .$if(!!filters?.afterUpdatedDate, (qb) =>
        qb.where("Booking.updatedAt", ">=", dayjs.utc(filters!.afterUpdatedDate).toDate())
      )
      .$if(!!filters?.beforeUpdatedDate, (qb) =>
        qb.where("Booking.updatedAt", "<=", dayjs.utc(filters!.beforeUpdatedDate).toDate())
      )
      .$if(!!filters?.afterCreatedDate, (qb) =>
        qb.where("Booking.createdAt", ">=", dayjs.utc(filters!.afterCreatedDate).toDate())
      )
      .$if(!!filters?.beforeCreatedDate, (qb) =>
        qb.where("Booking.createdAt", "<=", dayjs.utc(filters!.beforeCreatedDate).toDate())
      );
  }

  const hasTeamAccess = !!teamIdsWithBookingPermission?.length;

  if (hasTeamAccess) {
    // Team access: three parallel counts, each hitting a single index path.
    // This avoids the 7-branch UNION ALL + DISTINCT and the slow OR-based scan.
    //
    // Count A: bookings where organizer is a team member (covers UNION branches 1, 7)
    //          Uses index on (userId, status, startTime)
    // Count B: bookings for a team event type where organizer is NOT a team member
    //          (covers branch 6, excluding overlap with A)
    //          Uses index on (eventTypeId)
    // Count C: bookings where a team member is an attendee but organizer is NOT a
    //          team member and event type is NOT a team event type
    //          (covers branches 2-5, excluding overlap with A and B)
    //          This is the rare edge case — typically near zero.

    const teamMemberSubquery = (qb: ExpressionBuilder<DB, "Booking">) =>
      qb
        .selectFrom("Membership")
        .select("Membership.userId")
        .where("Membership.teamId", "in", teamIdsWithBookingPermission!);

    const teamEventTypeSubquery = (qb: ExpressionBuilder<DB, "Booking">) =>
      qb
        .selectFrom("EventType")
        .select("EventType.id")
        .where("EventType.teamId", "in", teamIdsWithBookingPermission!);

    // A: organizer is team member
    const countA = applyCountFilters(
      db.selectFrom("Booking").select("Booking.id").where("Booking.userId", "in", teamMemberSubquery)
    );

    // B: team event type, organizer NOT a team member
    // Use OR IS NULL to handle nullable userId — NULL NOT IN (...) evaluates to NULL in SQL.
    const countB = applyCountFilters(
      db
        .selectFrom("Booking")
        .select("Booking.id")
        .where("Booking.eventTypeId", "in", teamEventTypeSubquery)
        .where((eb) =>
          eb.or([eb("Booking.userId", "not in", teamMemberSubquery), eb("Booking.userId", "is", null)])
        )
    );

    // C: team member is attendee, not covered by A or B
    // Uses EXISTS to avoid joining Attendee/users/Membership into the outer query,
    // which would change the table set and break Kysely's type inference.
    // Use OR IS NULL for both nullable columns — NULL NOT IN (...) evaluates to NULL in SQL.
    const countC = applyCountFilters(
      db
        .selectFrom("Booking")
        .select("Booking.id")
        .where((eb) =>
          eb.or([eb("Booking.userId", "not in", teamMemberSubquery), eb("Booking.userId", "is", null)])
        )
        .where((eb) =>
          eb.or([
            eb("Booking.eventTypeId", "not in", teamEventTypeSubquery),
            eb("Booking.eventTypeId", "is", null),
          ])
        )
        .where(({ exists }) =>
          exists(
            db
              .selectFrom("Attendee")
              .select("Attendee.id")
              .innerJoin("users", "users.email", "Attendee.email")
              .innerJoin("Membership", "Membership.userId", "users.id")
              .where("Membership.teamId", "in", teamIdsWithBookingPermission)
              .where("Attendee.bookingId", "=", sql.ref<number>("Booking.id"))
          )
        )
    );

    const [resultA, resultB, resultC] = await Promise.all([
      db
        .selectFrom(countA.as("a"))
        .select(({ fn }) => fn.countAll<string>().as("cnt"))
        .executeTakeFirst(),
      db
        .selectFrom(countB.as("b"))
        .select(({ fn }) => fn.countAll<string>().as("cnt"))
        .executeTakeFirst(),
      db
        .selectFrom(countC.as("c"))
        .select(({ fn }) => fn.count<string>("c.id").distinct().as("cnt"))
        .executeTakeFirst(),
    ]);

    return Number(resultA?.cnt ?? 0) + Number(resultB?.cnt ?? 0) + Number(resultC?.cnt ?? 0);
  }

  // Personal bookings: two parallel counts that avoid UNION + DISTINCT.
  const organizerQuery = applyCountFilters(
    db.selectFrom("Booking").select("Booking.id").where("Booking.userId", "=", user.id)
  );

  const attendeeQuery = applyCountFilters(
    db
      .selectFrom("Booking")
      .select("Booking.id")
      .where((eb) => eb.or([eb("Booking.userId", "is", null), eb("Booking.userId", "!=", user.id)]))
  )
    .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
    .where("Attendee.email", "=", user.email);

  const [organizerResult, attendeeResult] = await Promise.all([
    db
      .selectFrom(organizerQuery.as("org_sub"))
      .select(({ fn }) => fn.countAll<string>().as("cnt"))
      .executeTakeFirst(),
    db
      .selectFrom(attendeeQuery.as("att_sub"))
      .select(({ fn }) => fn.count<string>("att_sub.id").distinct().as("cnt"))
      .executeTakeFirst(),
  ]);

  return Number(organizerResult?.cnt ?? 0) + Number(attendeeResult?.cnt ?? 0);
}

function buildStatusWhereClause(
  statuses: InputByStatus[],
  pastWindow?: { startTimeAfter: Date; startTimeBefore?: Date }
) {
  return ({ eb, or, and }: ExpressionBuilder<DB, "Booking">) =>
    or(
      statuses.map((status: InputByStatus) => {
        if (status === "upcoming") {
          return and([
            eb("Booking.endTime", ">=", new Date()),
            or([
              and([eb("Booking.recurringEventId", "is not", null), eb("Booking.status", "=", "accepted")]),
              and([
                eb("Booking.recurringEventId", "is", null),
                eb("Booking.status", "not in", ["cancelled", "rejected"]),
              ]),
            ]),
          ]);
        }

        if (status === "recurring") {
          return and([
            eb("Booking.endTime", ">=", new Date()),
            eb("Booking.recurringEventId", "is not", null),
            eb("Booking.status", "not in", ["cancelled", "rejected"]),
          ]);
        }

        if (status === "past") {
          const now = new Date();
          const conditions = [
            eb("Booking.endTime", "<=", now),
            eb("Booking.status", "not in", ["cancelled", "rejected"]),
          ];
          if (pastWindow) {
            conditions.push(eb("Booking.startTime", ">=", pastWindow.startTimeAfter));
            if (pastWindow.startTimeBefore) {
              conditions.push(eb("Booking.startTime", "<", pastWindow.startTimeBefore));
            }
          }
          return and(conditions);
        }

        if (status === "cancelled") {
          return eb("Booking.status", "in", ["cancelled", "rejected"]);
        }

        if (status === "unconfirmed") {
          return and([eb("Booking.endTime", ">=", new Date()), eb("Booking.status", "=", "pending")]);
        }
        return and([]);
      })
    );
}

function addStatusesQueryFilters(
  query: BookingsUnionQuery,
  statuses: InputByStatus[],
  pastWindow?: { startTimeAfter: Date; startTimeBefore?: Date }
) {
  if (statuses?.length) {
    return query.where(buildStatusWhereClause(statuses, pastWindow));
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
