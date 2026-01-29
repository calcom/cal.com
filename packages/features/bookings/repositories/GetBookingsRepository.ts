import dayjs from "@calcom/dayjs";
import { isTextFilterValue } from "@calcom/features/data-table/lib/utils";
import type { TextFilterValue } from "@calcom/features/data-table/lib/types";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { DB } from "@calcom/kysely";
import { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@trpc/server";
import type { Kysely, SelectQueryBuilder } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

const log = logger.getSubLogger({ prefix: ["GetBookingsRepository"] });

type InputByStatus = "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";

type BookingsUnionQuery = SelectQueryBuilder<
  DB,
  "Booking",
  Pick<Booking, "id" | "createdAt" | "updatedAt" | "startTime" | "endTime">
>;

export type GetBookingsFilters = {
  status?: InputByStatus;
  statuses?: InputByStatus[];
  teamIds?: number[] | undefined;
  userIds?: number[] | undefined;
  eventTypeIds?: number[] | undefined;
  attendeeEmail?: string | TextFilterValue;
  attendeeName?: string | TextFilterValue;
  bookingUid?: string | undefined;
  afterStartDate?: string;
  beforeEndDate?: string;
  afterUpdatedDate?: string;
  beforeUpdatedDate?: string;
  afterCreatedDate?: string;
  beforeCreatedDate?: string;
};

export type GetBookingsSortOptions = {
  sortStart?: "asc" | "desc";
  sortEnd?: "asc" | "desc";
  sortCreated?: "asc" | "desc";
  sortUpdated?: "asc" | "desc";
};

export interface IGetBookingsRepositoryDeps {
  prismaClient: PrismaClient;
}

type EnrichedUserData = {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  username: string | null;
};

export class GetBookingsRepository {
  constructor(private deps: IGetBookingsRepositoryDeps) {}

  /**
   * Fetches bookings for the web app with minimal relation fields.
   * This method returns only the fields needed by the web UI, excluding
   * sensitive or unnecessary fields like BookingReference.credentialId,
   * BookingReference.meetingPassword, etc.
   */
  async findManyForWeb(params: {
    user: { id: number; email: string; orgId?: number | null };
    filters: GetBookingsFilters;
    kysely: Kysely<DB>;
    bookingListingByStatus: InputByStatus[];
    sort?: GetBookingsSortOptions;
    take: number;
    skip: number;
  }) {
    return this.findManyInternal({ ...params, projection: "web" });
  }

  /**
   * Fetches bookings for API v2 with full relation fields.
   * This method returns all fields to maintain backward compatibility
   * with the existing API v2 contract.
   */
  async findManyForApiV2(params: {
    user: { id: number; email: string; orgId?: number | null };
    filters: GetBookingsFilters;
    kysely: Kysely<DB>;
    bookingListingByStatus: InputByStatus[];
    sort?: GetBookingsSortOptions;
    take: number;
    skip: number;
  }) {
    return this.findManyInternal({ ...params, projection: "api-v2" });
  }

  private async findManyInternal({
    user,
    filters,
    kysely,
    bookingListingByStatus,
    sort,
    take,
    skip,
    projection,
  }: {
    user: { id: number; email: string; orgId?: number | null };
    filters: GetBookingsFilters;
    kysely: Kysely<DB>;
    bookingListingByStatus: InputByStatus[];
    sort?: GetBookingsSortOptions;
    take: number;
    skip: number;
    projection: "web" | "api-v2";
  }) {
    const { prismaClient } = this.deps;
    const permissionCheckService = new PermissionCheckService();
    const fallbackRoles: MembershipRole[] = [MembershipRole.ADMIN, MembershipRole.OWNER];

    const teamIdsWithBookingPermission = await permissionCheckService.getTeamIdsWithPermission({
      userId: user.id,
      permission: "booking.read",
      fallbackRoles,
      orgId: user.orgId ?? undefined,
    });

    const needsUserIdsValidation = !!filters?.userIds && filters.userIds.length > 0;

    const [
      eventTypeIdsFromTeamIdsFilter,
      attendeeEmailsFromUserIdsFilter,
      eventTypeIdsFromEventTypeIdsFilter,
      allAccessibleUserIds,
    ] = await Promise.all([
      this.getEventTypeIdsFromTeamIdsFilter(filters?.teamIds),
      this.getAttendeeEmailsFromUserIdsFilter(user.email, filters?.userIds),
      this.getEventTypeIdsFromEventTypeIdsFilter(filters?.eventTypeIds),
      needsUserIdsValidation
        ? this.getUserIdsFromTeamIds(teamIdsWithBookingPermission)
        : Promise.resolve([]),
    ]);

    const bookingQueries: { query: BookingsUnionQuery; tables: (keyof DB)[] }[] = [];

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

    const queriesWithFilters = bookingQueries.map(({ query, tables }) => {
      let fullQuery = this.addStatusesQueryFilters(query, bookingListingByStatus);

      if (eventTypeIdsFromTeamIdsFilter && eventTypeIdsFromTeamIdsFilter.length > 0) {
        fullQuery = fullQuery.where("Booking.eventTypeId", "in", eventTypeIdsFromTeamIdsFilter);
      }

      if (eventTypeIdsFromEventTypeIdsFilter && eventTypeIdsFromEventTypeIdsFilter.length > 0) {
        fullQuery = fullQuery.where("Booking.eventTypeId", "in", eventTypeIdsFromEventTypeIdsFilter);
      }

      if (filters?.attendeeName) {
        if (typeof filters.attendeeName === "string") {
          fullQuery = fullQuery
            .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
            .where("Attendee.name", "=", filters.attendeeName.trim());
        } else if (isTextFilterValue(filters.attendeeName)) {
          fullQuery = this.addAdvancedAttendeeWhereClause(
            fullQuery,
            "name",
            filters.attendeeName.data.operator,
            filters.attendeeName.data.operand,
            tables.includes("Attendee")
          );
        }
      }

      if (filters?.attendeeEmail) {
        if (typeof filters.attendeeEmail === "string") {
          fullQuery = fullQuery
            .innerJoin("Attendee", "Attendee.bookingId", "Booking.id")
            .where("Attendee.email", "=", filters.attendeeEmail.trim());
        } else if (isTextFilterValue(filters.attendeeEmail)) {
          fullQuery = this.addAdvancedAttendeeWhereClause(
            fullQuery,
            "email",
            filters.attendeeEmail.data.operator,
            filters.attendeeEmail.data.operand,
            tables.includes("Attendee")
          );
        }
      }

      if (filters?.bookingUid) {
        fullQuery = fullQuery.where("Booking.uid", "=", filters.bookingUid.trim());
      }

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

    const orderBy = this.getOrderBy(bookingListingByStatus, sort);

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

    const plainBookings =
      bookingsFromUnion.length === 0
        ? []
        : await this.fetchBookingsWithRelations(
            kysely,
            bookingsFromUnion.map((b) => b.id),
            orderBy,
            projection
          );

    const [recurringInfoBasic, recurringInfoExtended] = await Promise.all([
      prismaClient.booking.groupBy({
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
      prismaClient.booking.groupBy({
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
        if (
          booking.seatsReferences.length &&
          !booking.eventType?.seatsShowAttendees &&
          !checkIfUserIsHost(user.id, booking)
        ) {
          booking.attendees = booking.attendees.filter((attendee) => attendee.email === user.email);
        }

        let rescheduler = null;
        if (booking.fromReschedule) {
          const rescheduledBooking = await prismaClient.booking.findUnique({
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

    const enrichedBookings = await this.enrichAttendeesWithUserData(bookings, kysely);

    return { bookings: enrichedBookings, recurringInfo, totalCount };
  }

  private async fetchBookingsWithRelations(
    kysely: Kysely<DB>,
    bookingIds: number[],
    orderBy: { key: "startTime" | "endTime" | "createdAt" | "updatedAt"; order: "desc" | "asc" },
    projection: "web" | "api-v2"
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
        eb
          .cast<Prisma.JsonValue>(eb.ref("Booking.responses"), "jsonb")
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
        // BookingReference - different fields based on projection
        projection === "web"
          ? jsonArrayFrom(
              eb
                .selectFrom("BookingReference")
                .select(["BookingReference.type", "BookingReference.uid", "BookingReference.meetingId"])
                .whereRef("BookingReference.bookingId", "=", "Booking.id")
            ).as("references")
          : jsonArrayFrom(
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
        // Attendee - different fields based on projection
        projection === "web"
          ? jsonArrayFrom(
              eb
                .selectFrom("Attendee")
                .select([
                  "Attendee.id",
                  "Attendee.email",
                  "Attendee.name",
                  "Attendee.timeZone",
                  "Attendee.phoneNumber",
                  "Attendee.locale",
                  "Attendee.noShow",
                ])
                .whereRef("Attendee.bookingId", "=", "Booking.id")
            ).as("attendees")
          : jsonArrayFrom(
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
        // AssignmentReason - different fields based on projection
        projection === "web"
          ? jsonArrayFrom(
              eb
                .selectFrom("AssignmentReason")
                .select([
                  "AssignmentReason.reasonEnum",
                  "AssignmentReason.reasonString",
                  "AssignmentReason.createdAt",
                ])
                .whereRef("AssignmentReason.bookingId", "=", "Booking.id")
                .orderBy("AssignmentReason.createdAt", "desc")
                .limit(1)
            ).as("assignmentReason")
          : jsonArrayFrom(
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

  private async enrichAttendeesWithUserData<
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
    const allAttendees = bookings.flatMap((booking) => booking.attendees);
    const uniqueAttendeeIds = Array.from(new Set(allAttendees.map((attendee) => attendee.id)));

    const enrichedAttendees =
      uniqueAttendeeIds.length > 0
        ? await kysely
            .selectFrom("Attendee")
            .leftJoin("users", "users.email", "Attendee.email")
            .select(["Attendee.id", "users.name", "Attendee.email", "users.avatarUrl", "users.username"])
            .where("Attendee.id", "in", uniqueAttendeeIds)
            .execute()
        : [];

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

    return bookings.map((booking) => ({
      ...booking,
      attendees: booking.attendees.map((attendee) => ({
        ...attendee,
        user: attendeeUserDataMap.get(attendee.id) || null,
      })),
    }));
  }

  private async getEventTypeIdsFromTeamIdsFilter(teamIds?: number[]) {
    if (!teamIds || teamIds.length === 0) {
      return undefined;
    }

    const result = await this.deps.prismaClient.$queryRaw<{ id: number }[]>`
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

  private async getAttendeeEmailsFromUserIdsFilter(userEmail: string, userIds?: number[]) {
    if (!userIds || userIds.length === 0) {
      return;
    }

    const attendeeEmailsFromUserIdsFilter = await this.deps.prismaClient.user
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

  private async getEventTypeIdsFromEventTypeIdsFilter(eventTypeIds?: number[]) {
    if (!eventTypeIds || eventTypeIds.length === 0) {
      return undefined;
    }
    const [directEventTypeIds, parentEventTypeIds] = await Promise.all([
      this.deps.prismaClient.eventType
        .findMany({
          where: {
            id: { in: eventTypeIds },
          },
          select: {
            id: true,
          },
        })
        .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),

      this.deps.prismaClient.eventType
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

  private async getUserIdsFromTeamIds(teamIds: number[]): Promise<number[]> {
    if (teamIds.length === 0) {
      return [];
    }

    const users = await this.deps.prismaClient.user.findMany({
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

  private addStatusesQueryFilters(query: BookingsUnionQuery, statuses: InputByStatus[]) {
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

  private addAdvancedAttendeeWhereClause(
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

  private getOrderBy(
    bookingListingByStatus: InputByStatus[],
    sort?: GetBookingsSortOptions
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
}
