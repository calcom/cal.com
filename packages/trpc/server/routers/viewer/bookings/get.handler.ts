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
      SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
      "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
      "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
      "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
      "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
      "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
      "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
      FROM "public"."Booking" 
      WHERE "public"."Booking"."userId" IN (${userIdsParams})
    `);
  } else {
    // Regular view: Current user created bookings
    sqlQueries.push(`
      SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
      "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
      "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
      "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
      "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
      "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
      "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
      FROM "public"."Booking" 
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
          SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
          "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
          "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
          "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
          "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
          "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
          "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
          FROM "public"."Booking" 
          WHERE "public"."Booking"."userId" IN (${userIdsParams})
        `);
      }
    }
  }

  if (!!filters?.userIds && filters.userIds.length > 0 && attendeeEmailsFromUserIdsFilter) {
    // Filtered view: Attendee email matches one of the filtered users' emails
    const attendeeEmailsParams = attendeeEmailsFromUserIdsFilter.map((email) => addParam(email)).join(", ");
    sqlQueries.push(`
      SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
      "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
      "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
      "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
      "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
      "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
      "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
      FROM "public"."Booking"
      INNER JOIN "public"."Attendee" ON "public"."Attendee"."bookingId" = "public"."Booking"."id"
      WHERE "public"."Attendee"."email" IN (${attendeeEmailsParams})
    `);
  } else {
    // Regular view: Current user is an attendee
    sqlQueries.push(`
      SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
      "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
      "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
      "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
      "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
      "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
      "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
      FROM "public"."Booking"
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
          SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
          "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
          "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
          "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
          "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
          "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
          "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
          FROM "public"."Booking"
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
      SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
      "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
      "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
      "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
      "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
      "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
      "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
      FROM "public"."Booking"
      INNER JOIN "public"."BookingSeat" ON "public"."BookingSeat"."bookingId" = "public"."Booking"."id"
      INNER JOIN "public"."Attendee" ON "public"."Attendee"."id" = "public"."BookingSeat"."attendeeId"
      WHERE "public"."Attendee"."email" IN (${attendeeEmailsParams})
    `);
  } else {
    // Regular view: Current user is an attendee via seats reference
    sqlQueries.push(`
      SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
      "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
      "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
      "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
      "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
      "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
      "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
      FROM "public"."Booking"
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
          SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
          "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
          "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
          "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
          "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
          "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
          "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
          FROM "public"."Booking"
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
      SELECT "public"."Booking"."id", "public"."Booking"."title", "public"."Booking"."userPrimaryEmail", 
      "public"."Booking"."description", "public"."Booking"."customInputs", "public"."Booking"."startTime", 
      "public"."Booking"."endTime", "public"."Booking"."metadata", "public"."Booking"."uid", 
      "public"."Booking"."responses", "public"."Booking"."recurringEventId", "public"."Booking"."location", 
      "public"."Booking"."eventTypeId", "public"."Booking"."status"::text as "status", "public"."Booking"."paid", 
      "public"."Booking"."userId", "public"."Booking"."fromReschedule", "public"."Booking"."rescheduled", 
      "public"."Booking"."isRecorded", "public"."Booking"."createdAt", "public"."Booking"."updatedAt"
      FROM "public"."Booking" 
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

  const [plainBookings, countResult] = await Promise.all([
    prisma.$queryRaw<any[]>(PrismaClientType.sql([finalQuery, ...params])),
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
      PrismaClientType.sql([recurringInfoBasicQuery, String(user.id)])
    ),
    prisma.$queryRaw<{ recurringEventId: string; status: string; startTime: Date }[]>(
      PrismaClientType.sql([recurringInfoExtendedQuery, String(user.id)])
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

    return {
      recurringEventId: info.recurringEventId,
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

  // Now enrich bookings with relation data
  const bookings = await Promise.all(
    plainBookings.map(async (booking) => {
      const attendees = await prisma.attendee.findMany({
        where: {
          bookingId: booking.id,
        },
      });

      const seatsReferences = await prisma.bookingSeat.findMany({
        where: {
          bookingId: booking.id,
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
      });

      const eventType = await prisma.eventType.findUnique({
        where: {
          id: booking.eventTypeId,
        },
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
      });

      // If seats are enabled and the event is not set to show attendees, filter out attendees that are not the current user
      const filteredAttendees =
        seatsReferences.length && eventType && !eventType.seatsShowAttendees
          ? attendees.filter((attendee) => attendee.email === user.email)
          : attendees;

      const payment = await prisma.payment.findFirst({
        where: {
          bookingId: booking.id,
        },
        select: {
          paymentOption: true,
          amount: true,
          currency: true,
          success: true,
        },
      });

      const bookingUser = await prisma.user.findUnique({
        where: {
          id: booking.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

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

      const assignmentReason = await prisma.assignmentReason.findFirst({
        where: {
          bookingId: booking.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      });

      const references = await prisma.bookingReference.findMany({
        where: {
          bookingId: booking.id,
        },
      });

      return {
        ...booking,
        attendees: filteredAttendees,
        seatsReferences,
        eventType: eventType
          ? {
              ...eventType,
              recurringEvent: parseRecurringEvent(eventType.recurringEvent),
              eventTypeColor: parseEventTypeColor(eventType.eventTypeColor),
              price: eventType.price || 0,
              currency: eventType.currency || "usd",
              metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
            }
          : null,
        payment,
        user: bookingUser,
        rescheduler,
        references,
        assignmentReason: assignmentReason ? [assignmentReason] : [],
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
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
