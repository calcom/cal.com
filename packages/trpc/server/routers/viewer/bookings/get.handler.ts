import { Prisma as PrismaClientType } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { isTextFilterValue } from "@calcom/features/data-table/lib/utils";
import { parseRecurringEvent, parseEventTypeColor } from "@calcom/lib";
import getAllUserBookings from "@calcom/lib/bookings/getAllUserBookings";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import { bookingMinimalSelect } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { type BookingStatus } from "@calcom/prisma/enums";
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
    },
    bookingListingByStatus: bookingListingByStatus,
    take,
    skip,
    filters: input.filters,
  });

  return {
    bookings,
    recurringInfo,
    totalCount,
  };
};

export async function getBookings({
  user,
  prisma,
  passedBookingsStatusFilter,
  filters,
  orderBy,
  take,
  skip,
}: {
  user: { id: number; email: string; orgId?: number | null };
  filters: TGetInputSchema["filters"];
  prisma: PrismaClient;
  passedBookingsStatusFilter: Prisma.BookingWhereInput;
  orderBy: Prisma.BookingOrderByWithAggregationInput;
  take: number;
  skip: number;
}) {
  // We'll keep track of the original booking select structure for reference
  const bookingSelect = {
    ...bookingMinimalSelect,
    uid: true,
    responses: true,
    routedFromRoutingFormReponse: {
      select: {
        id: true,
      },
    },
    recurringEventId: true,
    location: true,
    eventType: {
      select: {
        slug: true,
        id: true,
        title: true,
        eventName: true,
        price: true,
        recurringEvent: true,
        currency: true,
        metadata: true,
        disableGuests: true,
        seatsShowAttendees: true,
        seatsShowAvailabilityCount: true,
        eventTypeColor: true,
        customReplyToEmail: true,
        allowReschedulingPastBookings: true,
        hideOrganizerEmail: true,
        disableCancelling: true,
        disableRescheduling: true,
        schedulingType: true,
        length: true,
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    },
    status: true,
    paid: true,
    payment: {
      select: {
        paymentOption: true,
        amount: true,
        currency: true,
        success: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    fromReschedule: true,
    rescheduled: true,
    references: true,
    isRecorded: true,
    seatsReferences: {
      where: {
        attendee: {
          email: user.email,
        },
      },
      select: {
        referenceUid: true,
        attendee: {
          select: {
            email: true,
          },
        },
      },
    },
    assignmentReason: {
      orderBy: { createdAt: PrismaClientType.SortOrder.desc },
      take: 1,
    },
  };

  const membershipIdsWhereUserIsAdminOwner = (
    await prisma.membership.findMany({
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
    getUserIdsAndEmailsWhereUserIsAdminOrOwner(prisma, membershipConditionWhereUserIsAdminOwner, user.orgId),
  ]);

  // If user is organization owner/admin, contains organization members emails and ids (organization plan)
  // If user is only team owner/admin, contain team members emails and ids (teams plan)
  const [userIdsWhereUserIsAdminOrOwner, userEmailsWhereUserIsAdminOrOwner] =
    userIdsAndEmailsWhereUserIsAdminOrOwner;

  if (!!filters?.userIds && filters.userIds.length > 0) {
    const areUserIdsWithinUserOrgOrTeam = filters.userIds.every((userId) =>
      userIdsWhereUserIsAdminOrOwner.includes(userId)
    );

    if (!areUserIdsWithinUserOrgOrTeam) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permissions to fetch bookings for specified userIds",
      });
    }
  }

  const selectAndFromClause = `SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
  "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
  "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
  "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
  "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
  "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
  "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
  FROM "public"."Booking"`;

  const params: any[] = [];
  let paramIndex = 1;

  const addParam = (value: any) => {
    params.push(value);
    return `$${paramIndex++}`;
  };

  const sqlQueries: string[] = [];

  // 1. User created bookings
  if (!!filters?.userIds && filters.userIds.length > 0) {
    // Filtered view: Booking must match one of the specified users
    const userIdsParams = filters.userIds.map((id) => addParam(id)).join(", ");
    sqlQueries.push(`
      ${selectAndFromClause}
      WHERE "public"."Booking"."userId" IN (${userIdsParams})
    `);
  } else {
    // Regular view: Current user created bookings
    sqlQueries.push(`
     ${selectAndFromClause}
      WHERE "public"."Booking"."userId" = ${addParam(user.id)}
    `);

    // If user is admin/owner, add bookings created by users in their org/team
    if (userIdsWhereUserIsAdminOrOwner?.length) {
      const userIdsParams = userIdsWhereUserIsAdminOrOwner
        .filter((id) => id !== user.id) // Exclude current user as it's already covered
        .map((id) => addParam(id))
        .join(", ");

      if (userIdsParams) {
        sqlQueries.push(`
          ${selectAndFromClause}
          WHERE "public"."Booking"."userId" IN (${userIdsParams})
        `);
      }
    }
  }

  if (!!filters?.userIds && filters.userIds.length > 0 && attendeeEmailsFromUserIdsFilter) {
    // Filtered view: Attendee email matches one of the filtered users' emails
    const attendeeEmailsParams = attendeeEmailsFromUserIdsFilter.map((email) => addParam(email)).join(", ");
    sqlQueries.push(`
     ${selectAndFromClause}
      INNER JOIN "public"."Attendee" ON "public"."Attendee"."bookingId" = "public"."Booking"."id"
      WHERE "public"."Attendee"."email" IN (${attendeeEmailsParams})
    `);
  } else {
    // Regular view: Current user is an attendee
    sqlQueries.push(`
      ${selectAndFromClause}
      INNER JOIN "public"."Attendee" ON "public"."Attendee"."bookingId" = "public"."Booking"."id"
      WHERE "public"."Attendee"."email" = ${addParam(user.email)}
    `);

    // If user is ORG_OWNER/ADMIN or TEAM_OWNER/ADMIN, add query for organization/team members
    if (userEmailsWhereUserIsAdminOrOwner?.length) {
      const orgMemberEmailsParams = userEmailsWhereUserIsAdminOrOwner
        .filter((email) => email !== user.email) // Exclude current user as it's already covered
        .map((email) => addParam(email))
        .join(", ");

      if (orgMemberEmailsParams) {
        sqlQueries.push(`
          ${selectAndFromClause}
          INNER JOIN "public"."Attendee" ON "public"."Attendee"."bookingId" = "public"."Booking"."id"
          WHERE "public"."Attendee"."email" IN (${orgMemberEmailsParams})
        `);
      }
    }
  }

  if (!!filters?.userIds && filters.userIds.length > 0 && attendeeEmailsFromUserIdsFilter) {
    // Filtered view: Seat reference attendee email matches one of the filtered users' emails
    const attendeeEmailsParams = attendeeEmailsFromUserIdsFilter.map((email) => addParam(email)).join(", ");

    sqlQueries.push(`
      ${selectAndFromClause}
      INNER JOIN "public"."BookingSeat" ON "public"."BookingSeat"."bookingId" = "public"."Booking"."id"
      INNER JOIN "public"."Attendee" ON "public"."Attendee"."id" = "public"."BookingSeat"."attendeeId"
      WHERE "public"."Attendee"."email" IN (${attendeeEmailsParams})
    `);
  } else {
    // Regular view: Current user is an attendee via seats reference
    sqlQueries.push(`
      ${selectAndFromClause}
      INNER JOIN "public"."BookingSeat" ON "public"."BookingSeat"."bookingId" = "public"."Booking"."id"
      INNER JOIN "public"."Attendee" ON "public"."Attendee"."id" = "public"."BookingSeat"."attendeeId"
      WHERE "public"."Attendee"."email" = ${addParam(user.email)}
    `);

    // If user is ORG_OWNER/ADMIN or TEAM_OWNER/ADMIN, add query for organization/team members via BookingSeat
    if (userEmailsWhereUserIsAdminOrOwner?.length) {
      const orgMemberEmailsParams = userEmailsWhereUserIsAdminOrOwner
        .filter((email) => email !== user.email) // Exclude current user as it's already covered
        .map((email) => addParam(email))
        .join(", ");

      if (orgMemberEmailsParams) {
        sqlQueries.push(`
          ${selectAndFromClause}
          INNER JOIN "public"."BookingSeat" ON "public"."BookingSeat"."bookingId" = "public"."Booking"."id"
          INNER JOIN "public"."Attendee" ON "public"."Attendee"."id" = "public"."BookingSeat"."attendeeId"
          WHERE "public"."Attendee"."email" IN (${orgMemberEmailsParams})
        `);
      }
    }
  }

  if (!filters?.userIds && eventTypeIdsWhereUserIsAdminOrOwner?.length) {
    const eventTypeIdsParams = eventTypeIdsWhereUserIsAdminOrOwner.map((id) => addParam(id)).join(", ");
    sqlQueries.push(`
      ${selectAndFromClause}
      WHERE "public"."Booking"."eventTypeId" IN (${eventTypeIdsParams})
    `);
  }

  const whereConditions: string[] = [];

  if (passedBookingsStatusFilter.OR) {
    const orConditions = passedBookingsStatusFilter.OR;
    const statusConditions: string[] = [];

    for (const condition of orConditions) {
      const conditionParts: string[] = [];

      if (condition.endTime && typeof condition.endTime === "object" && "gte" in condition.endTime) {
        conditionParts.push(`data."endTime" >= ${addParam(condition.endTime.gte)}`);
      }
      if (condition.endTime && typeof condition.endTime === "object" && "lte" in condition.endTime) {
        conditionParts.push(`data."endTime" <= ${addParam(condition.endTime.lte)}`);
      }

      if (condition.status && typeof condition.status === "object" && "equals" in condition.status) {
        conditionParts.push(
          `CAST(data."status" AS "public"."BookingStatus") = CAST(${addParam(
            condition.status.equals
          )} AS "public"."BookingStatus")`
        );
      }
      if (
        condition.status &&
        typeof condition.status === "object" &&
        "notIn" in condition.status &&
        Array.isArray(condition.status.notIn)
      ) {
        const statusNotInConditions = condition.status.notIn.map(
          (status: string) =>
            `NOT CAST(data."status" AS "public"."BookingStatus") = CAST(${addParam(
              status
            )} AS "public"."BookingStatus")`
        );
        if (statusNotInConditions.length > 0) {
          conditionParts.push(`(${statusNotInConditions.join(" AND ")})`);
        }
      }

      if (
        condition.recurringEventId &&
        typeof condition.recurringEventId === "object" &&
        "not" in condition.recurringEventId &&
        condition.recurringEventId.not &&
        typeof condition.recurringEventId.not === "object" &&
        "equals" in condition.recurringEventId.not &&
        condition.recurringEventId.not.equals === null
      ) {
        conditionParts.push(`data."recurringEventId" IS NOT NULL`);
      }
      if (
        condition.recurringEventId &&
        typeof condition.recurringEventId === "object" &&
        "equals" in condition.recurringEventId &&
        condition.recurringEventId.equals === null
      ) {
        conditionParts.push(`data."recurringEventId" IS NULL`);
      }

      if (conditionParts.length > 0) {
        statusConditions.push(`(${conditionParts.join(" AND ")})`);
      }
    }

    if (statusConditions.length > 0) {
      whereConditions.push(`(${statusConditions.join(" OR ")})`);
    }
  }

  const andConditions: string[] = [];

  if (eventTypeIdsFromTeamIdsFilter && eventTypeIdsFromTeamIdsFilter.length > 0) {
    const eventTypeIdsParams = eventTypeIdsFromTeamIdsFilter.map((id) => addParam(id)).join(", ");
    andConditions.push(`data."eventTypeId" IN (${eventTypeIdsParams})`);
  }

  if (eventTypeIdsFromEventTypeIdsFilter && eventTypeIdsFromEventTypeIdsFilter.length > 0) {
    const eventTypeIdsParams = eventTypeIdsFromEventTypeIdsFilter.map((id) => addParam(id)).join(", ");
    andConditions.push(`data."eventTypeId" IN (${eventTypeIdsParams})`);
  }

  if (filters?.attendeeEmail) {
    if (typeof filters.attendeeEmail === "string") {
      // Simple string match (exact)
      andConditions.push(`data.id IN (
        SELECT "bookingId" FROM "public"."Attendee" 
        WHERE "email" = ${addParam(filters.attendeeEmail.trim())}
      )`);
    } else if (isTextFilterValue(filters.attendeeEmail)) {
      // Complex text filter (contains, startsWith, etc.)
      if (
        filters.attendeeEmail &&
        typeof filters.attendeeEmail === "object" &&
        "contains" in filters.attendeeEmail &&
        filters.attendeeEmail.contains
      ) {
        andConditions.push(`data.id IN (
          SELECT "bookingId" FROM "public"."Attendee" 
          WHERE "email" ILIKE ${addParam(`%${filters.attendeeEmail.contains}%`)}
        )`);
      } else if (
        filters.attendeeEmail &&
        typeof filters.attendeeEmail === "object" &&
        "startsWith" in filters.attendeeEmail &&
        filters.attendeeEmail.startsWith
      ) {
        andConditions.push(`data.id IN (
          SELECT "bookingId" FROM "public"."Attendee" 
          WHERE "email" ILIKE ${addParam(`${filters.attendeeEmail.startsWith}%`)}
        )`);
      } else if (
        filters.attendeeEmail &&
        typeof filters.attendeeEmail === "object" &&
        "endsWith" in filters.attendeeEmail &&
        filters.attendeeEmail.endsWith
      ) {
        andConditions.push(`data.id IN (
          SELECT "bookingId" FROM "public"."Attendee" 
          WHERE "email" ILIKE ${addParam(`%${filters.attendeeEmail.endsWith}`)}
        )`);
      } else if (
        filters.attendeeEmail &&
        typeof filters.attendeeEmail === "object" &&
        "equals" in filters.attendeeEmail &&
        filters.attendeeEmail.equals
      ) {
        andConditions.push(`data.id IN (
          SELECT "bookingId" FROM "public"."Attendee" 
          WHERE "email" = ${addParam(filters.attendeeEmail.equals)}
        )`);
      }
    }
  }

  if (filters?.attendeeName) {
    if (typeof filters.attendeeName === "string") {
      // Simple string match (exact)
      andConditions.push(`data.id IN (
        SELECT "bookingId" FROM "public"."Attendee" 
        WHERE "name" = ${addParam(filters.attendeeName.trim())}
      )`);
    } else if (isTextFilterValue(filters.attendeeName)) {
      // Complex text filter (contains, startsWith, etc.)
      if (
        filters.attendeeName &&
        typeof filters.attendeeName === "object" &&
        "contains" in filters.attendeeName &&
        filters.attendeeName.contains
      ) {
        andConditions.push(`data.id IN (
          SELECT "bookingId" FROM "public"."Attendee" 
          WHERE "name" ILIKE ${addParam(`%${filters.attendeeName.contains}%`)}
        )`);
      } else if (
        filters.attendeeName &&
        typeof filters.attendeeName === "object" &&
        "startsWith" in filters.attendeeName &&
        filters.attendeeName.startsWith
      ) {
        andConditions.push(`data.id IN (
          SELECT "bookingId" FROM "public"."Attendee" 
          WHERE "name" ILIKE ${addParam(`${filters.attendeeName.startsWith}%`)}
        )`);
      } else if (
        filters.attendeeName &&
        typeof filters.attendeeName === "object" &&
        "endsWith" in filters.attendeeName &&
        filters.attendeeName.endsWith
      ) {
        andConditions.push(`data.id IN (
          SELECT "bookingId" FROM "public"."Attendee" 
          WHERE "name" ILIKE ${addParam(`%${filters.attendeeName.endsWith}`)}
        )`);
      } else if (
        filters.attendeeName &&
        typeof filters.attendeeName === "object" &&
        "equals" in filters.attendeeName &&
        filters.attendeeName.equals
      ) {
        andConditions.push(`data.id IN (
          SELECT "bookingId" FROM "public"."Attendee" 
          WHERE "name" = ${addParam(filters.attendeeName.equals)}
        )`);
      }
    }
  }

  // Date Range Filters
  if (filters && "afterStartDate" in filters && filters.afterStartDate) {
    andConditions.push(`data."startTime" >= ${addParam(dayjs.utc(filters.afterStartDate).toDate())}`);
  }
  if (filters && "beforeEndDate" in filters && filters.beforeEndDate) {
    andConditions.push(`data."endTime" <= ${addParam(dayjs.utc(filters.beforeEndDate).toDate())}`);
  }
  if (filters && "afterUpdatedDate" in filters && filters.afterUpdatedDate) {
    andConditions.push(`data."updatedAt" >= ${addParam(dayjs.utc(filters.afterUpdatedDate).toDate())}`);
  }
  if (filters && "beforeUpdatedDate" in filters && filters.beforeUpdatedDate) {
    andConditions.push(`data."updatedAt" <= ${addParam(dayjs.utc(filters.beforeUpdatedDate).toDate())}`);
  }
  if (filters && "afterCreatedDate" in filters && filters.afterCreatedDate) {
    andConditions.push(`data."createdAt" >= ${addParam(dayjs.utc(filters.afterCreatedDate).toDate())}`);
  }
  if (filters && "beforeCreatedDate" in filters && filters.beforeCreatedDate) {
    andConditions.push(`data."createdAt" <= ${addParam(dayjs.utc(filters.beforeCreatedDate).toDate())}`);
  }

  const dateFilterKeys = [
    "afterStartDate",
    "beforeEndDate",
    "afterUpdatedDate",
    "beforeUpdatedDate",
    "afterCreatedDate",
    "beforeCreatedDate",
  ];

  const hasAnyDateFilter = dateFilterKeys.some(
    (key) =>
      filters && typeof filters === "object" && key in filters && !!filters[key as keyof typeof filters]
  );

  if (!hasAnyDateFilter) {
    if (userIdsWhereUserIsAdminOrOwner?.length || userEmailsWhereUserIsAdminOrOwner?.length) {
      const oneMonthAgo = dayjs.utc().subtract(1, "month").startOf("day").toDate();
      andConditions.push(`data."startTime" >= ${addParam(oneMonthAgo)}`);
    }
  }

  if (andConditions.length > 0) {
    whereConditions.push(`(${andConditions.join(" AND ")})`);
  }

  let orderByClause = "";
  if (orderBy.startTime) {
    orderByClause = `ORDER BY data."startTime" ${orderBy.startTime === "desc" ? "DESC" : "ASC"}`;
  } else if (orderBy.endTime) {
    orderByClause = `ORDER BY data."endTime" ${orderBy.endTime === "desc" ? "DESC" : "ASC"}`;
  } else if (orderBy.createdAt) {
    orderByClause = `ORDER BY data."createdAt" ${orderBy.createdAt === "desc" ? "DESC" : "ASC"}`;
  } else if (orderBy.updatedAt) {
    orderByClause = `ORDER BY data."updatedAt" ${orderBy.updatedAt === "desc" ? "DESC" : "ASC"}`;
  } else {
    orderByClause = `ORDER BY data."startTime" ASC`;
  }

  // Ensure consistent ordering by adding id as a secondary sort
  orderByClause += `, data.id ASC`;

  const finalQuery = `
    SELECT * FROM (
      ${sqlQueries.join("\nUNION\n")}
    ) data
    ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""}
    ${orderByClause}
    LIMIT ${addParam(take)} OFFSET ${addParam(skip)}
  `;

  const countQuery = `
    SELECT COUNT(*) as "count" FROM (
      ${sqlQueries.join("\nUNION\n")}
    ) data
    ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""}
  `;

  log.info(`Get bookings SQL query for user ${user.id}`, finalQuery);

  type RawBookingResult = {
    id: number;
    title: string;
    userPrimaryEmail: string | null;
    description: string | null;
    customInputs: Prisma.JsonValue;
    startTime: Date;
    endTime: Date;
    metadata: Prisma.JsonValue;
    uid: string;
    responses: Prisma.JsonValue;
    recurringEventId: string | null;
    location: string | null;
    eventTypeId: number | null;
    status: string;
    paid: boolean;
    userId: number | null;
    fromReschedule: string | null;
    rescheduled: boolean;
    isRecorded: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  const [plainBookings, countResult] = await Promise.all([
    prisma.$queryRaw<RawBookingResult[]>(PrismaClientType.sql([finalQuery, ...params])),
    prisma.$queryRaw<[{ count: bigint }]>(PrismaClientType.sql([countQuery, ...params])),
  ]);

  const totalCount = Number(countResult[0].count);

  const recurringInfoBasicQuery = `
    SELECT "recurringEventId",
           MIN("startTime") as "minStartTime", 
           COUNT("recurringEventId") as "countRecurringEventId"
    FROM "public"."Booking"
    WHERE "recurringEventId" IS NOT NULL
    AND "userId" = ${addParam(user.id)}
    GROUP BY "recurringEventId"
  `;

  const recurringInfoExtendedQuery = `
    SELECT "recurringEventId", "status", "startTime"
    FROM "public"."Booking"
    WHERE "recurringEventId" IS NOT NULL
    AND "userId" = ${addParam(user.id)}
    GROUP BY "recurringEventId", "status", "startTime"
  `;

  const [recurringInfoBasicResult, recurringInfoExtendedResult] = await Promise.all([
    prisma.$queryRaw<{ recurringEventId: string; minStartTime: Date; countRecurringEventId: bigint }[]>(
      PrismaClientType.sql([recurringInfoBasicQuery, ...params.slice(0, 1)]) // Use the already added parameter
    ),
    prisma.$queryRaw<{ recurringEventId: string; status: string; startTime: Date }[]>(
      PrismaClientType.sql([recurringInfoExtendedQuery, ...params.slice(0, 1)]) // Use the already added parameter
    ),
  ]);

  const recurringInfo = recurringInfoBasicResult.map((info) => {
    const bookings = recurringInfoExtendedResult.reduce(
      (prev, curr) => {
        if (curr.recurringEventId === info.recurringEventId) {
          const status = curr.status as keyof typeof prev;
          if (Object.prototype.hasOwnProperty.call(prev, status)) {
            prev[status].push(curr.startTime);
          }
        }
        return prev;
      },
      { ACCEPTED: [], CANCELLED: [], REJECTED: [], PENDING: [], AWAITING_HOST: [] } as {
        [key in BookingStatus]: Date[];
      }
    );

    // Ensure recurringEventId is always a string, never null
    return {
      recurringEventId: info.recurringEventId || "",
      count: Number(info.countRecurringEventId),
      firstDate: info.minStartTime,
      bookings,
    };
  });

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

  if (plainBookings.length === 0) {
    return { bookings: [], recurringInfo, totalCount };
  }

  const bookingIds = plainBookings.map((booking) => booking.id);
  const bookingIdsParam = bookingIds.map(() => addParam(bookingIds.shift())).join(", ");

  const comprehensiveQuery = `
    WITH booking_base AS (
      SELECT b.*
      FROM "public"."Booking" b
      WHERE b.id IN (${bookingIdsParam})
    ),
    
    attendees AS (
      SELECT 
        a.id, 
        a.email, 
        a.name, 
        a."timeZone", 
        a.locale,
        a."noShow",
        a."bookingId"
      FROM "public"."Attendee" a
      JOIN booking_base b ON a."bookingId" = b.id
    ),
    
    seats_references AS (
      SELECT 
        bs."referenceUid", 
        a.email as "attendeeEmail", 
        bs."bookingId"
      FROM "public"."BookingSeat" bs
      JOIN "public"."Attendee" a ON bs."attendeeId" = a.id
      JOIN booking_base b ON bs."bookingId" = b.id
      WHERE a.email = ${addParam(user.email)}
    ),
    
    event_types AS (
      SELECT 
        et.*,
        t.id as "teamId", 
        t.name as "teamName", 
        t.slug as "teamSlug", 
        b.id as "bookingId"
      FROM "public"."EventType" et
      LEFT JOIN "public"."Team" t ON et."teamId" = t.id
      JOIN booking_base b ON et.id = b."eventTypeId"
    ),
    
    payments AS (
      SELECT 
        p."paymentOption", 
        p.amount, 
        p.currency, 
        p.success, 
        p."bookingId"
      FROM "public"."Payment" p
      JOIN booking_base b ON p."bookingId" = b.id
    ),
    
    booking_users AS (
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        b.id as "bookingId"
      FROM "public"."User" u
      JOIN booking_base b ON u.id = b."userId"
    ),
    
    rescheduled_bookings AS (
      SELECT 
        b2.uid, 
        b2."rescheduledBy", 
        b1.id as "bookingId"
      FROM booking_base b1
      JOIN "public"."Booking" b2 ON b1."fromReschedule" = b2.uid
      WHERE b1."fromReschedule" IS NOT NULL
    ),
    
    assignment_reasons AS (
      SELECT DISTINCT ON (ar."bookingId")
        ar.id,
        ar.reason,
        ar."createdAt",
        ar."bookingId"
      FROM "public"."AssignmentReason" ar
      JOIN booking_base b ON ar."bookingId" = b.id
      ORDER BY ar."bookingId", ar."createdAt" DESC
    ),
    
    booking_references AS (
      SELECT 
        br.id,
        br.type,
        br.uid,
        br."bookingId"
      FROM "public"."BookingReference" br
      JOIN booking_base b ON br."bookingId" = b.id
    ),
    
    routing_form_responses AS (
      SELECT 
        rfr.id, 
        b.id as "bookingId"
      FROM "public"."RoutingFormResponse" rfr
      JOIN booking_base b ON rfr."bookingUid" = b.uid
    )
    
    SELECT 
      b.id,
      b.title,
      b.description,
      b."userPrimaryEmail",
      b."customInputs",
      b."startTime",
      b."endTime",
      b.metadata,
      b.uid,
      b.responses,
      b."recurringEventId",
      b.location,
      b."eventTypeId",
      b.status::text as status,
      b.paid,
      b."userId",
      b."fromReschedule",
      b.rescheduled,
      b."isRecorded",
      b."createdAt",
      b."updatedAt",
      
      -- Attendees as JSON array
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', a.id,
            'email', a.email,
            'name', a.name,
            'timeZone', a."timeZone",
            'locale', a.locale,
            'bookingId', a."bookingId",
            'noShow', a."noShow"
          )
        )
        FROM attendees a
        WHERE a."bookingId" = b.id), '[]'
      ) as "attendeesJson",
      
      -- Seat references as JSON array
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'referenceUid', sr."referenceUid",
            'attendee', json_build_object(
              'email', sr."attendeeEmail"
            )
          )
        )
        FROM seats_references sr
        WHERE sr."bookingId" = b.id), '[]'
      ) as "seatsReferencesJson",
      
      -- Event Type as JSON object
      (SELECT row_to_json(et)
       FROM (
         SELECT 
           et.id,
           et.slug,
           et.title,
           et."eventName",
           et.price,
           et."recurringEvent",
           et.currency,
           et.metadata,
           et."disableGuests",
           et."seatsShowAttendees",
           et."seatsShowAvailabilityCount",
           et."eventTypeColor",
           et."customReplyToEmail",
           et."allowReschedulingPastBookings",
           et."hideOrganizerEmail",
           et."disableCancelling",
           et."disableRescheduling",
           et."schedulingType",
           et.length,
           CASE WHEN et."teamId" IS NOT NULL THEN
             json_build_object(
               'id', et."teamId",
               'name', et."teamName",
               'slug', et."teamSlug"
             )
           ELSE NULL END as team
         FROM event_types et
         WHERE et."bookingId" = b.id
         LIMIT 1
       ) et
      ) as "eventTypeJson",
      
      -- Payments as JSON array
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'paymentOption', p."paymentOption",
            'amount', p.amount,
            'currency', p.currency,
            'success', p.success
          )
        )
        FROM payments p
        WHERE p."bookingId" = b.id), '[]'
      ) as "paymentJson",
      
      -- User as JSON object
      (SELECT row_to_json(u)
       FROM (
         SELECT 
           bu.id,
           bu.name,
           bu.email
         FROM booking_users bu
         WHERE bu."bookingId" = b.id
         LIMIT 1
       ) u
      ) as "userJson",
      
      -- Rescheduler
      (SELECT rb."rescheduledBy"
       FROM rescheduled_bookings rb
       WHERE rb."bookingId" = b.id
       LIMIT 1
      ) as "rescheduler",
      
      -- Assignment reasons as JSON array
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', ar.id,
            'reason', ar.reason,
            'createdAt', ar."createdAt"
          )
        )
        FROM assignment_reasons ar
        WHERE ar."bookingId" = b.id), '[]'
      ) as "assignmentReasonJson",
      
      -- References as JSON array
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', br.id,
            'type', br.type,
            'uid', br.uid
          )
        )
        FROM booking_references br
        WHERE br."bookingId" = b.id), '[]'
      ) as "referencesJson",
      
      -- Routing form response as JSON object
      (SELECT json_build_object(
        'id', rfr.id
      )
      FROM routing_form_responses rfr
      WHERE rfr."bookingId" = b.id
      LIMIT 1) as "routingFormResponseJson"
      
    FROM booking_base b
  `;

  const comprehensiveResults = await prisma.$queryRaw<any[]>(
    PrismaClientType.sql([comprehensiveQuery, ...params])
  );

  const bookings = comprehensiveResults.map((result) => {
    const attendees = JSON.parse(result.attendeesJson || "[]");
    const seatsReferences = JSON.parse(result.seatsReferencesJson || "[]");
    const eventTypeData = result.eventTypeJson;
    const payment = JSON.parse(result.paymentJson || "[]");
    const userData = result.userJson || { id: 0, name: "", email: "" };
    const assignmentReason = JSON.parse(result.assignmentReasonJson || "[]");
    const references = JSON.parse(result.referencesJson || "[]");
    const routedFromRoutingFormReponse = result.routingFormResponseJson;

    const eventType = eventTypeData
      ? {
          id: eventTypeData.id,
          slug: eventTypeData.slug || "",
          title: eventTypeData.title || "",
          eventName: eventTypeData.eventName || "",
          price: eventTypeData.price || 0,
          recurringEvent: parseRecurringEvent(eventTypeData.recurringEvent),
          currency: eventTypeData.currency || "usd",
          metadata: EventTypeMetaDataSchema.parse(eventTypeData.metadata || {}),
          disableGuests: eventTypeData.disableGuests || false,
          seatsShowAttendees: eventTypeData.seatsShowAttendees || false,
          seatsShowAvailabilityCount: eventTypeData.seatsShowAvailabilityCount || false,
          eventTypeColor: parseEventTypeColor(eventTypeData.eventTypeColor),
          customReplyToEmail: eventTypeData.customReplyToEmail,
          allowReschedulingPastBookings: eventTypeData.allowReschedulingPastBookings || false,
          hideOrganizerEmail: eventTypeData.hideOrganizerEmail || false,
          disableCancelling: eventTypeData.disableCancelling || false,
          disableRescheduling: eventTypeData.disableRescheduling || false,
          schedulingType: eventTypeData.schedulingType,
          length: eventTypeData.length || 0,
          team: eventTypeData.team,
        }
      : null;

    const filteredAttendees =
      seatsReferences.length && eventType && !eventType.seatsShowAttendees
        ? attendees.filter((attendee: { email: string }) => attendee.email === user.email)
        : attendees;

    return {
      id: result.id,
      title: result.title,
      description: result.description,
      userPrimaryEmail: result.userPrimaryEmail,
      customInputs: result.customInputs,
      startTime: new Date(result.startTime).toISOString(),
      endTime: new Date(result.endTime).toISOString(),
      metadata: result.metadata,
      uid: result.uid,
      responses: result.responses,
      recurringEventId: result.recurringEventId,
      location: result.location,
      eventTypeId: result.eventTypeId,
      status: result.status as BookingStatus,
      paid: result.paid,
      userId: result.userId,
      fromReschedule: result.fromReschedule,
      rescheduled: result.rescheduled,
      isRecorded: result.isRecorded,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,

      attendees: filteredAttendees,
      seatsReferences: seatsReferences,
      eventType: eventType,
      payment: payment,
      user: userData,
      rescheduler: result.rescheduler,
      references: references,
      assignmentReason: assignmentReason,
      routedFromRoutingFormReponse: routedFromRoutingFormReponse,
    };
  });

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
          teamId: { in: teamIds },
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
            teamId: { in: teamIds },
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
  membershipCondition: PrismaClientType.MembershipListRelationFilter
) {
  const [directTeamEventTypeIds, parentTeamEventTypeIds] = await Promise.all([
    prisma.eventType
      .findMany({
        where: {
          team: {
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
            team: {
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
 * Gets [IDs, Emails] of members where the auth user is admin/owner.
 * Scope depends on `orgId`:
 * - If set (number): Fetches members of that specific organization (`isOrganization: true`).
 * - If unset (null/undefined): Fetches members of all teams (`isOrganization: false`)
 * where the auth user meets the `membershipCondition`.
 *
 * @param prisma The Prisma client.
 * @param membershipCondition Filter defining the auth user's required role (e.g., OWNER/ADMIN)
 * to identify the target orgs/teams.
 * @param orgId Optional ID to target a specific org; absence targets teams.
 * @returns {Promise<[number[], string[]]>} [UserIDs, UserEmails] for members in the determined scope.
 */
async function getUserIdsAndEmailsWhereUserIsAdminOrOwner(
  prisma: PrismaClient,
  membershipCondition: PrismaClientType.MembershipListRelationFilter,
  orgId?: number | null
): Promise<[number[], string[]]> {
  const users = await prisma.user.findMany({
    where: {
      teams: {
        some: {
          team: orgId
            ? {
                isOrganization: true,
                members: membershipCondition,
                id: orgId,
              }
            : { isOrganization: false, members: membershipCondition, parentId: null },
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  });
  return [users.map((user) => user.id), users.map((user) => user.email)];
}
