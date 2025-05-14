import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma, Booking } from "@calcom/prisma/client";

import { withMiddleware } from "~/lib/helpers/withMiddleware";
import { buildWhereClause } from "~/lib/utils/bookings/get/buildWhereClause";
import {
  getAccessibleUsers,
  retrieveOrgScopedAccessibleUsers,
} from "~/lib/utils/retrieveScopedAccessibleUsers";
import { schemaBookingGetParams, schemaBookingReadPublic } from "~/lib/validations/booking";
import { schemaQuerySingleOrMultipleAttendeeEmails } from "~/lib/validations/shared/queryAttendeeEmail";
import { schemaQuerySingleOrMultipleExpand } from "~/lib/validations/shared/queryExpandRelations";
import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Find all bookings
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *         example: 123456789abcdefgh
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           oneOf:
 *            - type: integer
 *              example: 1
 *            - type: array
 *              items:
 *                type: integer
 *              example: [2, 3, 4]
 *       - in: query
 *         name: attendeeEmail
 *         required: false
 *         schema:
 *           oneOf:
 *            - type: string
 *              format: email
 *              example: john.doe@example.com
 *            - type: array
 *              items:
 *                type: string
 *                format: email
 *              example: [john.doe@example.com, jane.doe@example.com]
 *        - in: query
 *          name: order
 *          required: false
 *          schema:
 *          type: string
 *          enum: [asc, desc]
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *          type: string
 *          enum: [createdAt, updatedAt]
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *          type: string
 *          enum: [upcoming]
 *          description: Filter bookings by status, it will overwrite dateFrom and dateTo filters
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema:
 *          type: string
 *          description: ISO 8601 date string to filter bookings by start time
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *          type: string
 *          description: ISO 8601 date string to filter bookings by end time
 *     operationId: listBookings
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ArrayOfBookings"
 *             examples:
 *               bookings:
 *                 value: [
 *                   {
 *                     "booking": {
 *                       "id": 91,
 *                       "userId": 5,
 *                       "description": "",
 *                       "eventTypeId": 7,
 *                       "uid": "bFJeNb2uX8ANpT3JL5EfXw",
 *                       "title": "60min between Pro Example and John Doe",
 *                       "startTime": "2023-05-25T09:30:00.000Z",
 *                       "endTime": "2023-05-25T10:30:00.000Z",
 *                       "attendees": [
 *                         {
 *                           "email": "john.doe@example.com",
 *                           "name": "John Doe",
 *                           "timeZone": "Asia/Kolkata",
 *                           "locale": "en"
 *                         }
 *                       ],
 *                       "user": {
 *                         "email": "pro@example.com",
 *                         "name": "Pro Example",
 *                         "timeZone": "Asia/Kolkata",
 *                         "locale": "en"
 *                       },
 *                       "payment": [
 *                         {
 *                           "id": 1,
 *                           "success": true,
 *                           "paymentOption": "ON_BOOKING"
 *                         }
 *                       ],
 *                       "metadata": {},
 *                       "status": "ACCEPTED",
 *                       "responses": {
 *                         "email": "john.doe@example.com",
 *                         "name": "John Doe",
 *                         "location": {
 *                           "optionValue": "",
 *                           "value": "inPerson"
 *                         }
 *                       }
 *                     }
 *                   }
 *                 ]
 *       401:
 *         description: Authorization information is missing or invalid.
 *       404:
 *         description: No bookings were found
 */
type GetAdminArgsType = {
  adminDidQueryUserIds?: boolean;
  requestedUserIds: number[];
  userId: number;
};

export async function handler(req: NextApiRequest) {
  const {
    userId,
    isSystemWideAdmin,
    isOrganizationOwnerOrAdmin,
    pagination: { take, skip },
  } = req;
  const { dateFrom, dateTo, order, sortBy, status } = schemaBookingGetParams.parse(req.query);

  const args: Prisma.BookingFindManyArgs = {};
  if (req.query.take && req.query.page) {
    args.take = take;
    args.skip = skip;
  }
  const queryFilterForExpand = schemaQuerySingleOrMultipleExpand.parse(req.query.expand);
  const expand = Array.isArray(queryFilterForExpand)
    ? queryFilterForExpand
    : queryFilterForExpand
    ? [queryFilterForExpand]
    : [];

  args.include = {
    attendees: true,
    user: true,
    payment: true,
    eventType: expand.includes("team") ? { include: { team: true } } : false,
  };

  const queryFilterForAttendeeEmails = schemaQuerySingleOrMultipleAttendeeEmails.parse(req.query);
  const attendeeEmails = Array.isArray(queryFilterForAttendeeEmails.attendeeEmail)
    ? queryFilterForAttendeeEmails.attendeeEmail
    : typeof queryFilterForAttendeeEmails.attendeeEmail === "string"
    ? [queryFilterForAttendeeEmails.attendeeEmail]
    : [];
  const filterByAttendeeEmails = attendeeEmails.length > 0;
  let userEmailsToFilterBy: string[] = [];

  /** Only admins can query other users */
  if (isSystemWideAdmin) {
    if (req.query.userId || filterByAttendeeEmails) {
      const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
      const requestedUserIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];

      const systemWideAdminArgs = {
        adminDidQueryUserIds: !!req.query.userId,
        requestedUserIds,
        userId,
      };
      const { userId: argUserId, userIds, userEmails } = await handleSystemWideAdminArgs(systemWideAdminArgs);
      userEmailsToFilterBy = userEmails;
      args.where = buildWhereClause(argUserId, attendeeEmails, userIds);
    }
  } else if (isOrganizationOwnerOrAdmin) {
    let requestedUserIds = [userId];
    if (req.query.userId || filterByAttendeeEmails) {
      const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
      requestedUserIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    }
    const orgWideAdminArgs = {
      adminDidQueryUserIds: !!req.query.userId,
      requestedUserIds,
      userId,
    };
    const { userId: argUserId, userIds, userEmails } = await handleOrgWideAdminArgs(orgWideAdminArgs);
    userEmailsToFilterBy = userEmails;
    args.where = buildWhereClause(argUserId, attendeeEmails, userIds);
  } else {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    });
    if (!user) {
      throw new HttpError({ message: "User not found", statusCode: 404 });
    }
    args.where = buildWhereClause(userId, attendeeEmails, []);
  }

  if (dateFrom) {
    args.where = {
      ...args.where,
      startTime: { gte: dateFrom },
    };
  }
  if (dateTo) {
    args.where = {
      ...args.where,
      endTime: { lte: dateTo },
    };
  }

  if (sortBy === "updatedAt") {
    args.orderBy = {
      updatedAt: order,
    };
  }

  if (sortBy === "createdAt") {
    args.orderBy = {
      createdAt: order,
    };
  }

  if (status) {
    switch (status) {
      case "upcoming":
        args.where = {
          ...args.where,
          startTime: { gte: new Date().toISOString() },
        };
        break;
      default:
        throw new HttpError({ message: "Invalid status", statusCode: 400 });
    }
  }

  let data: Booking[] = [];

  if (!filterByAttendeeEmails && userEmailsToFilterBy.length > 0) {
    const queryOne = prisma.booking.findMany(args);

    const whereClauseForQueryTwo: Prisma.BookingWhereInput = {
      attendees: {
        some: {
          email: { in: userEmailsToFilterBy },
        },
      },
    };

    if (dateFrom) {
      whereClauseForQueryTwo.startTime = { gte: dateFrom };
    }
    if (dateTo) {
      whereClauseForQueryTwo.endTime = { lte: dateTo };
    }
    if (status === "upcoming") {
      whereClauseForQueryTwo.startTime = { gte: new Date().toISOString() };
    }

    const argsForQueryTwo: Prisma.BookingFindManyArgs = {
      ...args,
      where: whereClauseForQueryTwo,
    };

    const queryTwo = prisma.booking.findMany(argsForQueryTwo);

    const [resultOne, resultTwo] = await Promise.all([queryOne, queryTwo]);

    const bookingMap = new Map();
    [...resultOne, ...resultTwo].forEach((booking) => {
      bookingMap.set(booking.id, booking);
    });

    const dedupedResults = Array.from(bookingMap.values());

    if (args.orderBy) {
      let sortField: keyof Booking;
      let sortDirection: "asc" | "desc" = "asc";

      if (typeof args.orderBy === "object" && !Array.isArray(args.orderBy)) {
        const orderByKey = Object.keys(args.orderBy)[0] as keyof typeof args.orderBy;
        sortField = orderByKey as keyof Booking;
        sortDirection = args.orderBy[orderByKey] as "asc" | "desc";
      } else {
        sortField = "id";
      }

      const sortOrder = sortDirection === "desc" ? -1 : 1;

      dedupedResults.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue < bValue) return -1 * sortOrder;
        if (aValue > bValue) return 1 * sortOrder;
        return 0;
      });
    }

    if (args.take !== undefined && args.skip !== undefined) {
      data = dedupedResults.slice(args.skip, args.skip + args.take);
    } else {
      data = dedupedResults;
    }
  } else {
    data = await prisma.booking.findMany(args);
  }
  return { bookings: data.map((booking) => schemaBookingReadPublic.parse(booking)) };
}

const handleSystemWideAdminArgs = async ({
  adminDidQueryUserIds,
  requestedUserIds,
  userId,
}: GetAdminArgsType) => {
  if (adminDidQueryUserIds) {
    const users = await prisma.user.findMany({
      where: { id: { in: requestedUserIds } },
      select: { email: true },
    });
    const userEmails = users.map((u) => u.email);

    return { userId, userIds: requestedUserIds, userEmails };
  }
  return { userId: null, userIds: [], userEmails: [] };
};

const handleOrgWideAdminArgs = async ({
  adminDidQueryUserIds,
  requestedUserIds,
  userId,
}: GetAdminArgsType) => {
  if (adminDidQueryUserIds) {
    const accessibleUsersIds = await getAccessibleUsers({
      adminUserId: userId,
      memberUserIds: requestedUserIds,
    });

    if (!accessibleUsersIds.length) throw new HttpError({ message: "No User found", statusCode: 404 });
    const users = await prisma.user.findMany({
      where: { id: { in: accessibleUsersIds } },
      select: { email: true },
    });
    const userEmails = users.map((u) => u.email);
    return { userId, userIds: accessibleUsersIds, userEmails };
  } else {
    const accessibleUsersIds = await retrieveOrgScopedAccessibleUsers({
      adminId: userId,
    });

    const users = await prisma.user.findMany({
      where: { id: { in: accessibleUsersIds } },
      select: { email: true },
    });
    const userEmails = users.map((u) => u.email);
    return { userId, userIds: accessibleUsersIds, userEmails };
  }
};

export default withMiddleware("pagination")(defaultResponder(handler));
