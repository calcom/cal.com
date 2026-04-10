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

  const {
    bookings,
    recurringInfo,
    totalCount,
    hasMore: hasMoreBookings,
  } = await getAllUserBookings({
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

  // Generate next cursor for infinite query support
  const nextOffset = skip + take;
  const computedHasMore = totalCount !== null ? nextOffset < totalCount : hasMoreBookings;
  const nextCursor = computedHasMore ? nextOffset.toString() : undefined;

  return {
    bookings,
    recurringInfo,
    totalCount,
    nextCursor,
    hasMore: computedHasMore,
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
  }

  const orderBy = getOrderBy(bookingListingByStatus, sort);
  const hasTeamAccess = !!teamIdsWithBookingPermission?.length;

  // Shared filter logic applied to any base query (CTE or UNION ALL).
  // Only references "Booking.*" columns so it works regardless of whether
  // CTEs are present in the query's DB type.
  function applyCommonFilters<Q extends SelectQueryBuilder<any, "Booking", any>>(
    query: Q,
    isAttendeeTableJoined = false
  ): Q {
    let q: any = addStatusesQueryFilters(query, bookingListingByStatus);

    if (eventTypeIdsFromTeamIdsFilter && eventTypeIdsFromTeamIdsFilter.length > 0) {
      q = q.where("Booking.eventTypeId", "in", eventTypeIdsFromTeamIdsFilter);
    }
    if (eventTypeIdsFromEventTypeIdsFilter && eventTypeIdsFromEventTypeIdsFilter.length > 0) {
      q = q.where("Booking.eventTypeId", "in", eventTypeIdsFromEventTypeIdsFilter);
    }

    if (filters?.attendeeName) {
      if (typeof filters.attendeeName === "string") {
        if (!isAttendeeTableJoined) {
          q = q.innerJoin("Attendee", "Attendee.bookingId", "Booking.id");
        }
        q = q.where("Attendee.name", "=", filters.attendeeName.trim());
      } else if (isTextFilterValue(filters.attendeeName)) {
        q = addAdvancedAttendeeWhereClause(
          q,
          "name",
          filters.attendeeName.data.operator,
          filters.attendeeName.data.operand,
          isAttendeeTableJoined
        );
      }
    }

    if (filters?.attendeeEmail) {
      if (typeof filters.attendeeEmail === "string") {
        if (!isAttendeeTableJoined) {
          q = q.innerJoin("Attendee", "Attendee.bookingId", "Booking.id");
        }
        q = q.where("Attendee.email", "=", filters.attendeeEmail.trim());
      } else if (isTextFilterValue(filters.attendeeEmail)) {
        q = addAdvancedAttendeeWhereClause(
          q,
          "email",
          filters.attendeeEmail.data.operator,
          filters.attendeeEmail.data.operand,
          isAttendeeTableJoined
        );
      }
    }

    if (filters?.bookingUid) {
      q = q.where("Booking.uid", "=", filters.bookingUid.trim());
    }
    if (filters?.afterStartDate) {
      q = q.where("Booking.startTime", ">=", dayjs.utc(filters.afterStartDate).toDate());
    }
    if (filters?.beforeEndDate) {
      q = q.where("Booking.endTime", "<=", dayjs.utc(filters.beforeEndDate).toDate());
    }
    if (filters?.afterUpdatedDate) {
      q = q.where("Booking.updatedAt", ">=", dayjs.utc(filters.afterUpdatedDate).toDate());
    }
    if (filters?.beforeUpdatedDate) {
      q = q.where("Booking.updatedAt", "<=", dayjs.utc(filters.beforeUpdatedDate).toDate());
    }
    if (filters?.afterCreatedDate) {
      q = q.where("Booking.createdAt", ">=", dayjs.utc(filters.afterCreatedDate).toDate());
    }
    if (filters?.beforeCreatedDate) {
      q = q.where("Booking.createdAt", "<=", dayjs.utc(filters.beforeCreatedDate).toDate());
    }
    return q;
  }

  const bookingColumns = [
    "Booking.id",
    "Booking.startTime",
    "Booking.endTime",
    "Booking.createdAt",
    "Booking.updatedAt",
  ] as const;

  const isPastQuery =
    bookingListingByStatus.length === 1 &&
    (bookingListingByStatus[0] === "past" || bookingListingByStatus[0] === "cancelled") &&
    orderBy.order === "desc";

  let bookingsFromUnion: Pick<Booking, "id" | "createdAt" | "updatedAt" | "startTime" | "endTime">[];
  let totalCount: number | null = null;
  let hasMore = false;

  if (hasTeamAccess && !bookingQueries.length) {
    // ── CTE path: single query with OR conditions (bounded statuses only) ──
    // Used for upcoming/recurring/unconfirmed where the startTime lower bound
    // keeps scans tight. Unbounded statuses (past/cancelled) use UNION ALL below.
    const buildTeamCTEQuery = () => {
      return applyCommonFilters(
        kysely
          .with("team_user_ids", (db) =>
            db
              .selectFrom("Membership")
              .select("Membership.userId")
              .where("Membership.teamId", "in", teamIdsWithBookingPermission!)
          )
          .with("team_emails", (db) =>
            db
              .selectFrom("users")
              .select("users.email")
              .where(
                "users.id",
                "in",
                db.selectFrom("team_user_ids" as any).select("userId" as any)
              )
          )
          .with("team_event_type_ids", (db) =>
            db
              .selectFrom("EventType")
              .select("EventType.id")
              .where("EventType.teamId", "in", teamIdsWithBookingPermission!)
          )
          .selectFrom("Booking")
          .where(({ or, eb, exists, selectFrom }) =>
            or([
              eb("Booking.userId", "=", user.id),
              eb("Booking.userId", "in", (sub) =>
                sub.selectFrom("team_user_ids" as any).select("userId" as any)
              ),
              eb("Booking.eventTypeId", "in", (sub) =>
                sub.selectFrom("team_event_type_ids" as any).select("id" as any)
              ),
              exists(
                selectFrom("Attendee")
                  .select("Attendee.id")
                  .whereRef("Attendee.bookingId", "=", "Booking.id")
                  .where(({ or: innerOr, eb: innerEb }) =>
                    innerOr([
                      innerEb("Attendee.email", "=", user.email),
                      innerEb("Attendee.email", "in", (sub) =>
                        sub.selectFrom("team_emails" as any).select("email" as any)
                      ),
                    ])
                  )
              ),
            ])
          )
      );
    };

    // ── UNION ALL path for unbounded queries (past/cancelled) ──
    // Each branch hits its own optimal index. PG plans each independently,
    // avoiding the full startTime index walk that the CTE + OR approach needs.
    // The CTE path remains for bounded statuses where it's already fast.
    const buildTeamUnionBranches = (): BookingsUnionQuery[] => {
      // Branch 1: bookings by current team members (Booking_userId_idx)
      const userIdBranch = applyCommonFilters(
        kysely
          .selectFrom("Booking")
          .select(bookingColumns)
          .where(
            "Booking.userId",
            "in",
            kysely
              .selectFrom("Membership")
              .select("Membership.userId")
              .where("Membership.teamId", "in", teamIdsWithBookingPermission!)
          ) as BookingsUnionQuery
      );

      // Branch 2: bookings on team event types by non-members (Booking_eventTypeId_idx)
      // Catches ex-member and reassigned bookings
      const eventTypeBranch = applyCommonFilters(
        kysely
          .selectFrom("Booking")
          .select(bookingColumns)
          .where(
            "Booking.eventTypeId",
            "in",
            kysely
              .selectFrom("EventType")
              .select("EventType.id")
              .where("EventType.teamId", "in", teamIdsWithBookingPermission!)
          ) as BookingsUnionQuery
      );

      // Branch 3: bookings where a team member is an attendee (Attendee_email_idx)
      // Uses JOIN through Membership → users → Attendee → Booking so PG can
      // drive from the small Membership set and use indexes at each join step.
      const attendeeBranch = applyCommonFilters(
        kysely
          .selectFrom("Booking")
          .select(bookingColumns)
          .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
          .where(({ or, eb }) =>
            or([
              eb("Attendee.email", "=", user.email),
              eb(
                "Attendee.email",
                "in",
                kysely
                  .selectFrom("users")
                  .select("users.email")
                  .where(
                    "users.id",
                    "in",
                    kysely
                      .selectFrom("Membership")
                      .select("Membership.userId")
                      .where("Membership.teamId", "in", teamIdsWithBookingPermission!)
                  )
              ),
            ])
          ) as unknown as BookingsUnionQuery,
        true
      );

      return [userIdBranch, eventTypeBranch, attendeeBranch];
    };

    // Fetch take+1 to determine hasMore without a COUNT query.
    if (isPastQuery) {
      // Unbounded: UNION ALL lets PG use per-branch indexes directly.
      // No progressive window needed — each branch hits its own index.
      const branches = buildTeamUnionBranches();
      const union = branches.reduce((acc, q) => acc.unionAll(q));
      bookingsFromUnion = await kysely
        .selectFrom(union.as("union_subquery"))
        .distinct()
        .selectAll("union_subquery")
        .orderBy(orderBy.key, orderBy.order)
        .orderBy("id", orderBy.order)
        .limit(take + 1)
        .offset(skip)
        .execute();
      hasMore = bookingsFromUnion.length > take;
      bookingsFromUnion = bookingsFromUnion.slice(0, take);
    } else {
      bookingsFromUnion = await buildTeamCTEQuery()
        .select(bookingColumns)
        .orderBy(orderBy.key, orderBy.order)
        .orderBy("Booking.id", orderBy.order)
        .limit(take + 1)
        .offset(skip)
        .execute();
      hasMore = bookingsFromUnion.length > take;
      bookingsFromUnion = bookingsFromUnion.slice(0, take);
    }
    // totalCount derivation for team access path:
    //   - Page not full: derived for free (skip + rows)
    //   - requireExactCount (API): use EXPLAIN estimate (~10ms) instead of
    //     expensive COUNT queries that scan the full result set
    //   - Team bookings without requireExactCount: skip (expensive)
    if (!hasMore) {
      totalCount = skip + bookingsFromUnion.length;
    } else if (requireExactCount) {
      type PlanNode = { "Plan Rows": number; "Parent Relationship"?: string; Plans?: PlanNode[] };
      let countQueryBuilder;
      if (isPastQuery) {
        // Use UNION ALL shape for EXPLAIN — matches the query that was actually executed
        const branches = buildTeamUnionBranches();
        const union = branches.reduce((acc, q) => acc.unionAll(q));
        countQueryBuilder = kysely
          .selectFrom(union.as("union_subquery"))
          .select(({ fn }) => fn.count<number>("union_subquery.id").distinct().as("bookingCount"));
      } else {
        countQueryBuilder = buildTeamCTEQuery().select(({ fn }) =>
          fn.count<number>("Booking.id").as("bookingCount")
        );
      }
      const countQuery = countQueryBuilder.compile();
      const explainResult = await prisma.$queryRawUnsafe<[{ "QUERY PLAN": [{ Plan: PlanNode }] }]>(
        `EXPLAIN (FORMAT JSON) ${countQuery.sql}`,
        ...countQuery.parameters
      );
      const topPlan = explainResult[0]?.["QUERY PLAN"]?.[0]?.Plan;
      // For CTE: top node is Aggregate, scan child has the row estimate.
      // For UNION ALL: top node is Aggregate over Append, Plan Rows is the estimate.
      const scanChild = topPlan?.Plans?.find((p) => p["Parent Relationship"] !== "InitPlan");
      const estimatedRows = scanChild?.["Plan Rows"] ?? topPlan?.["Plan Rows"] ?? 0;
      totalCount = Math.round(estimatedRows);
    }
  } else {
    // ── UNION ALL path: personal bookings or userIds filter ──
    // Separate queries that PG plans independently, each with an efficient
    // index scan, then deduplicate via DISTINCT on the union.

    // For personal bookings (no userIds filter), build userId + attendee branches
    if (!bookingQueries.length) {
      bookingQueries.push(
        {
          query: kysely
            .selectFrom("Booking")
            .select(bookingColumns)
            .where("Booking.userId", "=", user.id) as BookingsUnionQuery,
          tables: ["Booking"],
        },
        {
          query: kysely
            .selectFrom("Booking")
            .select(bookingColumns)
            .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
            .where("Attendee.email", "=", user.email) as unknown as BookingsUnionQuery,
          tables: ["Booking", "Attendee"],
        }
      );
    }

    // Apply common filters to each branch and UNION ALL them
    const filteredQueries = bookingQueries.map(({ query, tables }) =>
      applyCommonFilters(query, tables.includes("Attendee"))
    );
    const unionQuery = filteredQueries.reduce((acc, query) => acc.unionAll(query));

    const [bookings, countResult] = await Promise.all([
      kysely
        .selectFrom(unionQuery.as("union_subquery"))
        .distinct()
        .selectAll("union_subquery")
        .orderBy(orderBy.key, orderBy.order)
        .orderBy("id", orderBy.order)
        .limit(take)
        .offset(skip)
        .execute(),
      kysely
        .selectFrom(unionQuery.as("count_subquery"))
        .select(({ fn }) => fn.count<number>("count_subquery.id").distinct().as("bookingCount"))
        .executeTakeFirst(),
    ]);

    bookingsFromUnion = bookings;
    totalCount = Number(countResult?.bookingCount ?? 0);
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

  // App-level event type scope: filter out bookings for event types belonging to
  // teams the user doesn't have access to. This replaces the correlated EXISTS
  // (eventTypeScope) that was previously in the SQL query but caused Postgres
  // planner estimation failures and IOPS spikes in production.
  const scopedBookings =
    hasTeamAccess && teamIdsWithBookingPermission?.length
      ? plainBookings.filter((booking) => {
          const teamId = booking.eventType?.teamId ?? null;
          if (teamId === null) return true;
          if (teamIdsWithBookingPermission.includes(teamId)) return true;
          if (booking.user?.id === user.id) return true;
          if (booking.attendees.some((a) => a.email === user.email)) return true;
          return false;
        })
      : plainBookings;

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
      ids: scopedBookings.map((booking) => booking.id),
      filters,
      orderBy,
      take,
      skip,
    })
  );

  const checkIfUserIsHost = (userId: number, booking: (typeof scopedBookings)[number]) => {
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
    scopedBookings.map(async (booking) => {
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

  return { bookings: enrichedBookings, recurringInfo, totalCount, hasMore };
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
    const countB = applyCountFilters(
      db
        .selectFrom("Booking")
        .select("Booking.id")
        .where("Booking.eventTypeId", "in", teamEventTypeSubquery)
        .where("Booking.userId", "not in", teamMemberSubquery)
    );

    // C: team member is attendee, not covered by A or B
    // Uses EXISTS to avoid joining Attendee/users/Membership into the outer query,
    // which would change the table set and break Kysely's type inference.
    const countC = applyCountFilters(
      db
        .selectFrom("Booking")
        .select("Booking.id")
        .where("Booking.userId", "not in", teamMemberSubquery)
        .where("Booking.eventTypeId", "not in", teamEventTypeSubquery)
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
    db.selectFrom("Booking").select("Booking.id").where("Booking.userId", "!=", user.id)
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

function buildStatusWhereClause(statuses: InputByStatus[]) {
  return ({ eb, or, and }: ExpressionBuilder<DB, "Booking">) =>
    or(
      statuses.map((status: InputByStatus) => {
        if (status === "upcoming") {
          const now = new Date();
          return and([
            // 1h lookback covers in-progress bookings; lets PG use the startTime index
            eb("Booking.startTime", ">=", new Date(now.getTime() - 60 * 60 * 1000)),
            eb("Booking.endTime", ">=", now),
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
          const now = new Date();
          return and([
            eb("Booking.startTime", ">=", new Date(now.getTime() - 60 * 60 * 1000)),
            eb("Booking.endTime", ">=", now),
            eb("Booking.recurringEventId", "is not", null),
            eb("Booking.status", "not in", ["cancelled", "rejected"]),
          ]);
        }

        if (status === "past") {
          const now = new Date();
          return and([
            eb("Booking.endTime", "<=", now),
            eb("Booking.status", "not in", ["cancelled", "rejected"]),
          ]);
        }

        if (status === "cancelled") {
          return eb("Booking.status", "in", ["cancelled", "rejected"]);
        }

        if (status === "unconfirmed") {
          const now = new Date();
          return and([
            eb("Booking.startTime", ">=", new Date(now.getTime() - 60 * 60 * 1000)),
            eb("Booking.endTime", ">=", now),
            eb("Booking.status", "=", "pending"),
          ]);
        }
        return and([]);
      })
    );
}

function addStatusesQueryFilters(
  query: SelectQueryBuilder<any, "Booking", any>,
  statuses: InputByStatus[]
) {
  if (statuses?.length) {
    return query.where(buildStatusWhereClause(statuses));
  }

  return query;
}

function addAdvancedAttendeeWhereClause(
  query: SelectQueryBuilder<any, "Booking", any>,
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
  let fullQuery: any = isAttendeeTableJoined
    ? query
    : query.innerJoin("Attendee", "Attendee.bookingId", "Booking.id");

  switch (operator) {
    case "endsWith":
      fullQuery = fullQuery.where(`Attendee.${key}`, "ilike", `%${operand}`);
      break;

    case "startsWith":
      fullQuery = fullQuery.where(`Attendee.${key}`, "ilike", `${operand}%`);
      break;

    case "equals":
      fullQuery = fullQuery.where(`Attendee.${key}`, "ilike", operand.replace(/[%_\\]/g, "\\$&"));
      break;

    case "notEquals":
      fullQuery = fullQuery.where(`Attendee.${key}`, "not ilike", operand.replace(/[%_\\]/g, "\\$&"));
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
