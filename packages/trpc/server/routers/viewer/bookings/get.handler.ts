import dayjs from "@calcom/dayjs";
import getAllUserBookings from "@calcom/features/bookings/lib/getAllUserBookings";
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
import type { Kysely, SelectQueryBuilder } from "kysely";
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
    sort: input.sort,
  });

  // Generate next cursor for infinite query support
  const nextOffset = skip + take;
  const hasMore = nextOffset < totalCount;
  const nextCursor = hasMore ? nextOffset.toString() : undefined;

  return {
    bookings,
    recurringInfo,
    totalCount,
    nextCursor,
  };
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

  // Validate userIds filter if provided
  if (!!filters?.userIds && filters.userIds.length > 0) {
    const areUserIdsWithinUserOrgOrTeam = filters.userIds.every((userId) =>
      allAccessibleUserIds.includes(userId)
    );

    const isCurrentUser = filters.userIds.length === 1 && user.id === filters.userIds[0];

    if (!areUserIdsWithinUserOrgOrTeam && !isCurrentUser) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permissions to fetch bookings for specified userIds",
      });
    }
  }

  const orderBy = getOrderBy(bookingListingByStatus, sort);

  const hasUserIdsFilter = !!filters?.userIds && filters.userIds.length > 0;
  const hasTeamAccess = !!teamIdsWithBookingPermission?.length;

  const nameFilterParams = parseAttendeeFilterParams(filters?.attendeeName);
  const emailFilterParams = parseAttendeeFilterParams(filters?.attendeeEmail);

  const positiveOps = new Set(["equals", "contains", "startsWith", "endsWith", "isEmpty"]);
  const nameIsPositive = !!nameFilterParams && positiveOps.has(nameFilterParams.operator);
  // For email "equals", use correlated EXISTS + ILIKE instead of the pre-query.
  // The pre-query scans the full 16M-row Attendee table with exact match, which breaks
  // on mixed-case emails (e.g. "Carina@cal.com" != "carina@cal.com").
  // EXISTS runs ILIKE only against each candidate booking's ~3 attendees (post-CTE narrowing).
  const emailIsPositive =
    !!emailFilterParams &&
    positiveOps.has(emailFilterParams.operator) &&
    emailFilterParams.operator !== "equals";

  // Pre-compute attendee filter booking IDs as separate queries.
  // Running these separately prevents PG's optimizer from derailing the main
  // query's execution plan when an IN subquery is combined with complex OR conditions.
  let attendeeFilterBookingIds: number[] | undefined;
  if (nameIsPositive || emailIsPositive) {
    const preQueries: Promise<number[]>[] = [];
    if (nameIsPositive) {
      preQueries.push(
        queryAttendeeBookingIds(kysely, "name", nameFilterParams!.operator, nameFilterParams!.operand)
      );
    }
    if (emailIsPositive) {
      preQueries.push(
        queryAttendeeBookingIds(kysely, "email", emailFilterParams!.operator, emailFilterParams!.operand)
      );
    }
    const preResults = await Promise.all(preQueries);
    if (preResults.length === 1) {
      attendeeFilterBookingIds = preResults[0];
    } else {
      const firstSet = new Set(preResults[0]);
      attendeeFilterBookingIds = preResults[1].filter((id) => firstSet.has(id));
    }
  }

  function applyCommonFilters(
    query: SelectQueryBuilder<DB, "Booking", {}>
  ): SelectQueryBuilder<DB, "Booking", {}> {
    let q: SelectQueryBuilder<DB, "Booking", {}> = addStatusesQueryFilters(query, bookingListingByStatus);

    if (eventTypeIdsFromTeamIdsFilter && eventTypeIdsFromTeamIdsFilter.length > 0) {
      q = q.where("Booking.eventTypeId", "in", eventTypeIdsFromTeamIdsFilter);
    }
    if (eventTypeIdsFromEventTypeIdsFilter && eventTypeIdsFromEventTypeIdsFilter.length > 0) {
      q = q.where("Booking.eventTypeId", "in", eventTypeIdsFromEventTypeIdsFilter);
    }

    if (attendeeFilterBookingIds !== undefined) {
      if (attendeeFilterBookingIds.length === 0) {
        q = q.where("Booking.id", "=", -1);
      } else {
        // Use ANY(array) instead of IN($1,$2,...$N) to pass a single array
        // parameter. IN expands to N individual params which overflows PG's
        // bind limit when used inside UNION ALL branches.
        q = q.where(sql`"Booking"."id" = ANY(${sql.val(attendeeFilterBookingIds)}::int[])` as any);
      }
    }
    if (nameFilterParams && !nameIsPositive) {
      q = addAttendeeExistsFilter(
        q,
        "name",
        nameFilterParams.operator as "notEquals" | "notContains" | "isNotEmpty",
        nameFilterParams.operand
      );
    }
    if (emailFilterParams && !emailIsPositive) {
      q = addAttendeeExistsFilter(
        q,
        "email",
        emailFilterParams.operator as "equals" | "notEquals" | "notContains" | "isNotEmpty",
        emailFilterParams.operand
      );
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

  async function executePaginatedAndCount(baseQuery: SelectQueryBuilder<DB, "Booking", {}>): Promise<{
    bookingsFromQuery: Pick<Booking, "id" | "startTime" | "endTime" | "createdAt" | "updatedAt">[];
    totalCount: number;
  }> {
    const [bookings, countResult] = await Promise.all([
      baseQuery
        .select("Booking.id")
        .select("Booking.startTime")
        .select("Booking.endTime")
        .select("Booking.createdAt")
        .select("Booking.updatedAt")
        .orderBy(orderBy.key, orderBy.order)
        .orderBy("Booking.id", orderBy.order)
        .limit(take)
        .offset(skip)
        .execute(),
      baseQuery.select(({ fn }) => fn.count<number>("Booking.id").as("bookingCount")).executeTakeFirst(),
    ]);

    return {
      bookingsFromQuery: bookings,
      totalCount: Number(countResult?.bookingCount ?? 0),
    };
  }

  let bookingsFromUnion: Pick<Booking, "id" | "startTime" | "endTime" | "createdAt" | "updatedAt">[];
  let totalCount: number;

  if (hasUserIdsFilter && hasTeamAccess) {
    const base = applyCommonFilters(
      kysely
        .with("team_event_type_ids", (db) =>
          db
            .selectFrom("EventType")
            .select("EventType.id")
            .where("EventType.teamId", "in", teamIdsWithBookingPermission!)
        )
        .selectFrom("Booking")
        .where(({ or, and, eb, exists, selectFrom }) => {
          // Event type scope: allow team, personal, and null — exclude other teams
          // Keep in sync with the same filter in the hasTeamAccess branch below
          const eventTypeScope = or([
            eb("Booking.eventTypeId", "is", null),
            eb("Booking.eventTypeId", "in", (sub) =>
              sub.selectFrom("team_event_type_ids").select("team_event_type_ids.id")
            ),
            exists(
              selectFrom("EventType")
                .select("EventType.id")
                .whereRef("EventType.id", "=", "Booking.eventTypeId")
                .where("EventType.teamId", "is", null)
            ),
          ]);

          const conditions = [and([eb("Booking.userId", "in", filters.userIds!), eventTypeScope])];
          if (attendeeEmailsFromUserIdsFilter?.length) {
            conditions.push(
              and([
                exists(
                  selectFrom("Attendee")
                    .select("Attendee.id")
                    .whereRef("Attendee.bookingId", "=", "Booking.id")
                    .where("Attendee.email", "in", attendeeEmailsFromUserIdsFilter)
                ),
                eventTypeScope,
              ])
            );
          }
          return or(conditions);
        })
    );
    ({ bookingsFromQuery: bookingsFromUnion, totalCount } = await executePaginatedAndCount(base));
  } else if (hasUserIdsFilter) {
    const base = applyCommonFilters(
      kysely.selectFrom("Booking").where(({ or, eb, exists, selectFrom }) => {
        const conditions = [eb("Booking.userId", "in", filters.userIds!)];
        if (attendeeEmailsFromUserIdsFilter?.length) {
          conditions.push(
            exists(
              selectFrom("Attendee")
                .select("Attendee.id")
                .whereRef("Attendee.bookingId", "=", "Booking.id")
                .where("Attendee.email", "in", attendeeEmailsFromUserIdsFilter)
            )
          );
        }
        return or(conditions);
      })
    );
    ({ bookingsFromQuery: bookingsFromUnion, totalCount } = await executePaginatedAndCount(base));
  } else if (hasTeamAccess) {
    // UNION ALL: split the 4-way OR into separate queries that PG plans
    // independently, each with an efficient index scan. The single OR-based
    // query forced PG into sequential scans on the Booking table due to
    // correlated EXISTS sub-queries in the eventTypeScope check, causing
    // statement timeouts on past/cancelled pages with large datasets.

    // Pre-compute team data once so each branch can use simple IN() filters
    // instead of CTE-based subqueries that PG re-evaluates per row.
    const [teamUserIds, teamEmails, teamEventTypeIds] = await Promise.all([
      kysely
        .selectFrom("Membership")
        .select("Membership.userId")
        .where("Membership.teamId", "in", teamIdsWithBookingPermission!)
        .execute()
        .then((rows) => rows.map((r) => r.userId)),
      kysely
        .selectFrom("Membership")
        .innerJoin("users", "users.id", "Membership.userId")
        .select("users.email")
        .where("Membership.teamId", "in", teamIdsWithBookingPermission!)
        .execute()
        .then((rows) => rows.map((r) => r.email)),
      kysely
        .selectFrom("EventType")
        .select("EventType.id")
        .where("EventType.teamId", "in", teamIdsWithBookingPermission!)
        .execute()
        .then((rows) => rows.map((r) => r.id)),
    ]);

    // Restrict to team/personal event types only.
    const applyEventTypeScope = (
      q: SelectQueryBuilder<DB, "Booking", {}>
    ): SelectQueryBuilder<DB, "Booking", {}> => {
      if (teamEventTypeIds.length === 0) {
        return q.where(({ or, eb, exists, selectFrom }) =>
          or([
            eb("Booking.eventTypeId", "is", null),
            exists(
              selectFrom("EventType")
                .select("EventType.id")
                .whereRef("EventType.id", "=", "Booking.eventTypeId")
                .where("EventType.teamId", "is", null)
            ),
          ])
        );
      }
      return q.where(({ or, eb, exists, selectFrom }) =>
        or([
          eb("Booking.eventTypeId", "is", null),
          eb("Booking.eventTypeId", "in", teamEventTypeIds),
          exists(
            selectFrom("EventType")
              .select("EventType.id")
              .whereRef("EventType.id", "=", "Booking.eventTypeId")
              .where("EventType.teamId", "is", null)
          ),
        ])
      );
    }

    const selectBookingCols = (q: SelectQueryBuilder<DB, "Booking", {}>) =>
      q
        .select("Booking.id")
        .select("Booking.startTime")
        .select("Booking.endTime")
        .select("Booking.createdAt")
        .select("Booking.updatedAt");

    const queryOwnBookings = selectBookingCols(
      applyCommonFilters(kysely.selectFrom("Booking").where("Booking.userId", "=", user.id))
    );

    const queryTeamUserBookings =
      teamUserIds.length > 0
        ? selectBookingCols(
            applyEventTypeScope(
              applyCommonFilters(
                kysely.selectFrom("Booking").where("Booking.userId", "in", teamUserIds)
              )
            )
          )
        : null;

    const queryTeamEventTypes =
      teamEventTypeIds.length > 0
        ? selectBookingCols(
            applyCommonFilters(
              kysely.selectFrom("Booking").where("Booking.eventTypeId", "in", teamEventTypeIds)
            )
          )
        : null;

    const attendeeEmails = Array.from(new Set([user.email, ...teamEmails]));
    const queryByAttendee = selectBookingCols(
      applyEventTypeScope(
        applyCommonFilters(
          // @ts-expect-error Kysely type widening after INNER JOIN; only Booking.* columns are referenced.
          kysely
            .selectFrom("Booking")
            .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
            .where("Attendee.email", "in", attendeeEmails)
        )
      )
    );

    let unionQuery = queryOwnBookings;
    if (queryTeamUserBookings) {
      unionQuery = unionQuery.unionAll(queryTeamUserBookings);
    }
    if (queryTeamEventTypes) {
      unionQuery = unionQuery.unionAll(queryTeamEventTypes);
    }
    unionQuery = unionQuery.unionAll(queryByAttendee);

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
  } else {
    // UNION ALL: two separate queries that PG plans independently, each with
    // an efficient index scan (Nested Loop on Attendee_email_idx → Booking_pkey
    // for the attendee branch, index scan on Booking_userId_idx for the user
    // branch), then deduplicate. This avoids the OR + correlated EXISTS which
    // forces PG into a sequential scan at scale.
    const queryByUserId = applyCommonFilters(
      kysely.selectFrom("Booking").where("Booking.userId", "=", user.id)
    )
      .select("Booking.id")
      .select("Booking.startTime")
      .select("Booking.endTime")
      .select("Booking.createdAt")
      .select("Booking.updatedAt");

    const queryByAttendee = applyCommonFilters(
      // @ts-expect-error Kysely widens the type to include "Attendee" after INNER JOIN,
      // but applyCommonFilters only references "Booking.*" columns so this is safe.
      kysely
        .selectFrom("Booking")
        .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
        .where("Attendee.email", "=", user.email)
    )
      .select("Booking.id")
      .select("Booking.startTime")
      .select("Booking.endTime")
      .select("Booking.createdAt")
      .select("Booking.updatedAt");

    const unionQuery = queryByUserId.unionAll(queryByAttendee);

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

  log.debug(`Get bookings for user ${user.id}`);

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
                // Only fetch hosts that are also attendees of THIS booking, instead of all hosts
                // — avoids serializing many thousands of rows in large orgs.
                jsonArrayFrom(
                  eb
                    .selectFrom("Host")
                    .innerJoin("users", "users.id", "Host.userId")
                    .innerJoin("Attendee", (join) =>
                      join
                        .onRef("Attendee.bookingId", "=", "Booking.id")
                        .onRef("Attendee.email", "=", "users.email")
                    )
                    .select((eb) => [
                      "Host.userId",
                      jsonObjectFrom(
                        eb
                          .selectFrom("users as u2")
                          .select(["u2.id", "u2.email"])
                          .whereRef("Host.userId", "=", "u2.id")
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
            eb
              .selectFrom("Attendee")
              .select((eb) => [
                "Attendee.id",
                "Attendee.email",
                "Attendee.name",
                "Attendee.timeZone",
                "Attendee.phoneNumber",
                "Attendee.locale",
                "Attendee.bookingId",
                "Attendee.noShow",
                jsonObjectFrom(
                  eb
                    .selectFrom("users")
                    .select(["users.name", "users.email", "users.avatarUrl", "users.username"])
                    .whereRef("users.email", "=", "Attendee.email")
                ).as("user"),
              ])
              .whereRef("Attendee.bookingId", "=", "Booking.id")
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
        .orderBy("Booking.id", orderBy.order)
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

  return { bookings, recurringInfo, totalCount };
}


/**
 * Gets event type IDs for the given team IDs using an optimized raw SQL query.
 *
 * This query uses a UNION to combine:
 * 1. Child event types whose parent belongs to the specified teams (managed event types)
 * 2. Direct team event types that belong to the specified teams
 *
 * The subquery structure `WHERE "parent"."id" IN (SELECT "id" FROM "EventType" WHERE "teamId" IN (...)))`
 * is intentional — it allows PostgreSQL to use the composite index on EventType(parentId, teamId)
 * efficiently via Nested Loop joins, resulting in significantly faster execution compared to a direct
 * WHERE clause on parent.teamId.
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

function addStatusesQueryFilters(
  query: SelectQueryBuilder<DB, "Booking", {}>,
  statuses: InputByStatus[]
): SelectQueryBuilder<DB, "Booking", {}> {
  if (statuses?.length) {
    return query.where(({ eb, or, and }) =>
      or(
        statuses.map((status) => {
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
            return and([
              eb("Booking.endTime", "<=", new Date()),
              eb("Booking.status", "not in", ["cancelled", "rejected"]),
            ]);
          }

          if (status === "cancelled") {
            return eb("Booking.status", "in", ["cancelled", "rejected"]);
          }

          if (status === "unconfirmed") {
            return and([eb("Booking.endTime", ">=", new Date()), eb("Booking.status", "=", "pending")]);
          }
          return and([]);
        })
      )
    );
  }

  return query;
}

function addAttendeeExistsFilter(
  query: SelectQueryBuilder<DB, "Booking", {}>,
  key: "name" | "email",
  operator: "equals" | "notEquals" | "notContains" | "isNotEmpty",
  operand: string
): SelectQueryBuilder<DB, "Booking", {}> {
  const columnRef = `Attendee.${key}` as "Attendee.name" | "Attendee.email";

  return query.where(({ exists, selectFrom }) => {
    const base = selectFrom("Attendee")
      .select("Attendee.id")
      .whereRef("Attendee.bookingId", "=", "Booking.id");

    switch (operator) {
      case "equals":
        // Use ILIKE for case-insensitive match. This is safe in a correlated EXISTS
        // because it only checks the ~3 attendees of each candidate booking (post-CTE),
        // not the full 16M-row Attendee table.
        return exists(base.where(columnRef, "ilike", operand.replace(/[%_\\]/g, "\\$&")));
      case "notEquals":
        return exists(base.where(columnRef, "not ilike", operand.replace(/[%_\\]/g, "\\$&")));
      case "notContains":
        return exists(base.where(columnRef, "not ilike", `%${operand.replace(/[%_\\]/g, "\\$&")}%`));
      case "isNotEmpty":
        return exists(base.where(columnRef, "!=", ""));
    }
  });
}

function parseAttendeeFilterParams(
  filter: unknown
): { operator: string; operand: string } | null {
  if (!filter) return null;
  if (typeof filter === "string") return { operator: "equals", operand: filter.trim() };
  if (isTextFilterValue(filter)) return { operator: filter.data.operator, operand: filter.data.operand };
  return null;
}

async function queryAttendeeBookingIds(
  kysely: Kysely<DB>,
  key: "name" | "email",
  operator: string,
  operand: string
): Promise<number[]> {
  const columnRef = `Attendee.${key}` as "Attendee.name" | "Attendee.email";

  let query = kysely.selectFrom("Attendee").select("Attendee.bookingId").distinct();

  switch (operator) {
    case "equals":
      if (key === "email") {
        query = query.where(columnRef, "=", operand.toLowerCase());
      } else {
        query = query.where(columnRef, "ilike", operand.replace(/[%_\\]/g, "\\$&"));
      }
      break;
    case "startsWith":
      query = query.where(columnRef, "ilike", `${operand.replace(/[%_\\]/g, "\\$&")}%`);
      break;
    case "endsWith":
      query = query.where(columnRef, "ilike", `%${operand.replace(/[%_\\]/g, "\\$&")}`);
      break;
    case "contains":
      query = query.where(columnRef, "ilike", `%${operand.replace(/[%_\\]/g, "\\$&")}%`);
      break;
    case "isEmpty":
      query = query.where(columnRef, "=", "");
      break;
  }

  const results = await query.execute();
  return results.map((r) => r.bookingId).filter((id): id is number => id !== null);
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
