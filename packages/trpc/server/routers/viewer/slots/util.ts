import process from "node:process";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { orgDomainConfig } from "@calcom/ee/organizations/lib/orgDomains";
import { getAggregatedAvailability } from "@calcom/features/availability/lib/getAggregatedAvailability/getAggregatedAvailability";
import type {
  CurrentSeats,
  EventType,
  GetAvailabilityUser,
  UserAvailabilityService,
} from "@calcom/features/availability/lib/getUserAvailability";
import type { CheckBookingLimitsService } from "@calcom/features/bookings/lib/checkBookingLimits";
import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";
import type { QualifiedHostsService } from "@calcom/features/bookings/lib/host-filtering/findQualifiedHostsWithDelegationCredentials";
import { isEventTypeLoggingEnabled } from "@calcom/features/bookings/lib/isEventTypeLoggingEnabled";
import {
  getRoundRobinHostLimitOverrides,
  groupRoundRobinHostsByEffectiveLimits,
  resolveRoundRobinHostEffectiveLimits,
} from "@calcom/features/bookings/lib/handleNewBooking/resolveRoundRobinHostEffectiveLimits";
import type {
  EffectiveHostLimits,
  RoundRobinHostLimitOverrideSource,
} from "@calcom/features/bookings/lib/handleNewBooking/resolveRoundRobinHostEffectiveLimits";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { BusyTimesService } from "@calcom/features/busyTimes/services/getBusyTimes";
import type { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { getDefaultEvent } from "@calcom/features/eventtypes/lib/defaultEvents";
import type { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { PrismaOOORepository } from "@calcom/features/ooo/repositories/PrismaOOORepository";
import type { IRedisService } from "@calcom/features/redis/IRedisService";
import { buildDateRanges } from "@calcom/features/schedules/lib/date-ranges";
import type { DateRange } from "@calcom/features/schedules/lib/date-ranges";
import getSlots from "@calcom/features/schedules/lib/slots";
import type { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import type { ISelectedSlotRepository } from "@calcom/features/selectedSlots/repositories/ISelectedSlotRepository";
import type { NoSlotsNotificationService } from "@calcom/features/slots/handleNotificationWhenNoSlots";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import { filterBlockedHosts } from "@calcom/features/watchlist/operations/filter-blocked-hosts.controller";
import { shouldIgnoreContactOwner } from "@calcom/lib/bookings/routing/utils";
import { DEFAULT_GROUP_ID, RESERVED_SUBDOMAINS } from "@calcom/lib/constants";
import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { descendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import LimitManager, { LimitSources } from "@calcom/lib/intervalLimits/limitManager";
import { isBookingWithinPeriod } from "@calcom/lib/intervalLimits/utils";
import {
  BookingDateInPastError,
  calculatePeriodLimits,
  isTimeOutOfBounds,
  isTimeViolatingFutureLimit,
} from "@calcom/lib/isOutOfBounds";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { RoutingFormResponseRepository } from "@calcom/features/routing-forms/repositories/RoutingFormResponseRepository";
import { PeriodType, SchedulingType } from "@calcom/prisma/enums";
import type { CalendarFetchMode, EventBusyDate, EventBusyDetails } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import { TRPCError } from "@trpc/server";
import type { Logger } from "tslog";
import { v4 as uuid } from "uuid";
import type { TGetScheduleInputSchema } from "./getSchedule.schema";
import type { GetScheduleOptions } from "./types";
import type { OrgMembershipLookup } from "@calcom/features/di/modules/OrgMembershipLookup";
import type { IGetAvailableSlots } from "@calcom/features/bookings/Booker/hooks/useAvailableTimeSlots";
import type { Prisma } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["[slots/util]"] });
const DEFAULT_SLOTS_CACHE_TTL = 2000;

type GetAvailabilityUserWithDelegationCredentials = Omit<NonNullable<GetAvailabilityUser>, "credentials"> & {
  credentials: CredentialForCalendarService[];
};

type AvailableSlotsEventType = Exclude<
  Awaited<ReturnType<(typeof AvailableSlotsService)["prototype"]["getRegularOrDynamicEventType"]>>,
  null
>;

type OverrideAwareAvailabilityUser = GetAvailabilityUserWithDelegationCredentials & {
  isFixed?: boolean;
  groupId?: string | null;
  overrideMinimumBookingNotice?: number | null;
  overrideBeforeEventBuffer?: number | null;
  overrideAfterEventBuffer?: number | null;
  overrideSlotInterval?: number | null;
  overrideBookingLimits?: Prisma.JsonValue | null;
  overrideDurationLimits?: Prisma.JsonValue | null;
  overridePeriodType?: PeriodType | null;
  overridePeriodStartDate?: Date | null;
  overridePeriodEndDate?: Date | null;
  overridePeriodDays?: number | null;
  overridePeriodCountCalendarDays?: boolean | null;
};

type OverrideAwareHost = RoundRobinHostLimitOverrideSource & {
  isFixed?: boolean;
  groupId?: string | null;
  user: GetAvailabilityUserWithDelegationCredentials;
};

type SlotResult = ReturnType<typeof getSlots>[number];

const getEventLevelLimits = (
  eventType: Pick<
    AvailableSlotsEventType,
    | "minimumBookingNotice"
    | "beforeEventBuffer"
    | "afterEventBuffer"
    | "slotInterval"
    | "bookingLimits"
    | "durationLimits"
    | "periodType"
    | "periodDays"
    | "periodCountCalendarDays"
    | "periodStartDate"
    | "periodEndDate"
  >
): EffectiveHostLimits => ({
  minimumBookingNotice: eventType.minimumBookingNotice,
  beforeEventBuffer: eventType.beforeEventBuffer,
  afterEventBuffer: eventType.afterEventBuffer,
  slotInterval: eventType.slotInterval,
  bookingLimits: eventType.bookingLimits,
  durationLimits: eventType.durationLimits,
  periodType: eventType.periodType,
  periodDays: eventType.periodDays,
  periodCountCalendarDays: eventType.periodCountCalendarDays,
  periodStartDate: eventType.periodStartDate,
  periodEndDate: eventType.periodEndDate,
});

const buildEventTypeWithEffectiveLimits = ({
  eventType,
  effectiveLimits,
}: {
  eventType: AvailableSlotsEventType;
  effectiveLimits: EffectiveHostLimits;
}) => ({
  ...eventType,
  minimumBookingNotice: effectiveLimits.minimumBookingNotice,
  beforeEventBuffer: effectiveLimits.beforeEventBuffer,
  afterEventBuffer: effectiveLimits.afterEventBuffer,
  slotInterval: effectiveLimits.slotInterval,
  bookingLimits: effectiveLimits.bookingLimits,
  durationLimits: effectiveLimits.durationLimits,
  periodType: effectiveLimits.periodType,
  periodDays: effectiveLimits.periodDays,
  periodCountCalendarDays: effectiveLimits.periodCountCalendarDays,
  periodStartDate: effectiveLimits.periodStartDate,
  periodEndDate: effectiveLimits.periodEndDate,
});

const getSlotKey = (slot: SlotResult) => slot.time.toISOString();

const mergeSlotMaps = (slotMaps: Map<string, SlotResult>[]) => {
  const mergedSlotMap = new Map<string, SlotResult>();

  slotMaps.forEach((slotMap) => {
    slotMap.forEach((slot, key) => {
      mergedSlotMap.set(key, slot);
    });
  });

  return mergedSlotMap;
};

const intersectSlotMaps = (baseSlotMap: Map<string, SlotResult>, nextSlotMap: Map<string, SlotResult>) => {
  const intersectedSlotMap = new Map<string, SlotResult>();

  baseSlotMap.forEach((slot, key) => {
    if (nextSlotMap.has(key)) {
      intersectedSlotMap.set(key, slot);
    }
  });

  return intersectedSlotMap;
};

export type GetAvailableSlotsResponse = Awaited<
  ReturnType<(typeof AvailableSlotsService)["prototype"]["_getAvailableSlots"]>
>;

export interface IAvailableSlotsService {
  oooRepo: PrismaOOORepository;
  scheduleRepo: ScheduleRepository;
  selectedSlotRepo: ISelectedSlotRepository;
  teamRepo: TeamRepository;
  userRepo: UserRepository;
  bookingRepo: BookingRepository;
  eventTypeRepo: EventTypeRepository;
  routingFormResponseRepo: RoutingFormResponseRepository;
  checkBookingLimitsService: CheckBookingLimitsService;
  userAvailabilityService: UserAvailabilityService;
  busyTimesService: BusyTimesService;
  redisClient: IRedisService;
  featuresRepo: FeaturesRepository;
  qualifiedHostsService: QualifiedHostsService;
  noSlotsNotificationService: NoSlotsNotificationService;
  orgMembershipLookup: OrgMembershipLookup;
}

function withSlotsCache(
  redisClient: IRedisService,
  func: (args: GetScheduleOptions) => Promise<IGetAvailableSlots>
) {
  return async (args: GetScheduleOptions): Promise<IGetAvailableSlots> => {
    const cacheKey = `${JSON.stringify(args.input)}`;
    let success = false;
    let cachedResult: IGetAvailableSlots | null = null;
    const startTime = process.hrtime();
    try {
      cachedResult = await redisClient.get(cacheKey);
      success = true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "TimeoutError") {
        const endTime = process.hrtime(startTime);
        log.error(`Redis request timed out after ${endTime[0]}${endTime[1] / 1e6}ms`);
      } else {
        throw err;
      }
    }

    if (!success) {
      // If the cache request fails, we proceed to call the function directly
      return await func(args);
    }
    if (cachedResult) {
      log.info("[CACHE HIT] Available slots", { cacheKey });
      return cachedResult;
    }
    const result = await func(args);
    const ttl = parseInt(process.env.SLOTS_CACHE_TTL ?? "", 10) || DEFAULT_SLOTS_CACHE_TTL;
    // we do not wait for the cache to complete setting; we fire and forget, and hope it'll finish.
    // this is to already start responding to the client.
    redisClient.set(cacheKey, result, { ttl });
    log.info("[CACHE MISS] Available slots", { cacheKey, ttl });
    return result;
  };
}

export class AvailableSlotsService {
  constructor(public readonly dependencies: IAvailableSlotsService) {}

  private async _getReservedSlotsAndCleanupExpired({
    bookerClientUid,
    usersWithCredentials,
    eventTypeId,
  }: {
    bookerClientUid: string | undefined;
    usersWithCredentials: NonNullable<GetAvailabilityUser>[];
    eventTypeId: number;
  }) {
    const currentTimeInUtc = dayjs.utc().format();
    const slotsRepo = this.dependencies.selectedSlotRepo;

    const unexpiredSelectedSlots =
      (await slotsRepo.findManyUnexpiredSlots({
        userIds: usersWithCredentials.map((user) => user.id),
        currentTimeInUtc,
      })) || [];

    const slotsSelectedByOtherUsers = unexpiredSelectedSlots.filter((slot) => slot.uid !== bookerClientUid);

    await _cleanupExpiredSlots({ eventTypeId });

    const reservedSlots = slotsSelectedByOtherUsers;

    return reservedSlots;

    async function _cleanupExpiredSlots({ eventTypeId }: { eventTypeId: number }) {
      await slotsRepo.deleteManyExpiredSlots({ eventTypeId, currentTimeInUtc });
    }
  }

  private async _getDynamicEventType(
    input: TGetScheduleInputSchema,
    organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
  ) {
    const { currentOrgDomain, isValidOrgDomain } = organizationDetails;
    // For dynamic booking, we need to get and update user credentials, schedule and availability in the eventTypeObject as they're required in the new availability logic
    if (!input.eventTypeSlug) {
      // never happens as it's guarded by our Zod Schema refine, but for clear type safety we throw an Error if the eventTypeSlug isn't given.
      throw new Error("Event type slug is required in dynamic booking.");
    }
    const dynamicEventType = getDefaultEvent(input.eventTypeSlug);

    const userRepo = this.dependencies.userRepo;
    const usersForDynamicEventType = await userRepo.findManyUsersForDynamicEventType({
      currentOrgDomain: isValidOrgDomain ? currentOrgDomain : null,
      usernameList: Array.isArray(input.usernameList)
        ? input.usernameList
        : input.usernameList
          ? [input.usernameList]
          : [],
    });

    const usersWithOldSelectedCalendars = usersForDynamicEventType.map((user) => withSelectedCalendars(user));

    const isDynamicAllowed = !usersWithOldSelectedCalendars.some((user) => !user.allowDynamicBooking);
    if (!isDynamicAllowed) {
      throw new TRPCError({
        message: "Some of the users in this group do not allow dynamic booking",
        code: "UNAUTHORIZED",
      });
    }
    return Object.assign({}, dynamicEventType, {
      users: usersWithOldSelectedCalendars,
    });
  }
  private getDynamicEventType = withReporting(this._getDynamicEventType.bind(this), "getDynamicEventType");

  private applyOccupiedSeatsToCurrentSeats(
    currentSeats: CurrentSeats,
    occupiedSeats: { slotUtcStartDate: Date }[]
  ) {
    const occupiedSeatsMap = new Map<string, number>();

    occupiedSeats.forEach((item) => {
      const dateKey = item.slotUtcStartDate.toISOString();
      occupiedSeatsMap.set(dateKey, (occupiedSeatsMap.get(dateKey) || 0) + 1);
    });

    occupiedSeatsMap.forEach((count, date) => {
      currentSeats.push({
        uid: uuid(),
        startTime: dayjs(date).toDate(),
        _count: { attendees: count },
      });
    });

    return currentSeats;
  }

  private async _getEventType(
    input: TGetScheduleInputSchema,
    organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
  ) {
    const { eventTypeSlug, usernameList, isTeamEvent } = input;
    log.info(
      "getEventType",
      safeStringify({ usernameList, eventTypeSlug, isTeamEvent, organizationDetails })
    );
    const eventTypeId =
      input.eventTypeId ||
      (await this.getEventTypeId({
        slug: usernameList?.[0],
        eventTypeSlug: eventTypeSlug,
        isTeamEvent,
        organizationDetails,
      }));

    if (!eventTypeId) {
      return null;
    }

    const eventTypeRepo = this.dependencies.eventTypeRepo;
    return await eventTypeRepo.findForSlots({ id: eventTypeId });
  }

  private getEventType = withReporting(this._getEventType.bind(this), "getEventType");

  private doesRangeStartFromToday(periodType: PeriodType) {
    return periodType === PeriodType.ROLLING_WINDOW || periodType === PeriodType.ROLLING;
  }

  /**
   * Filters slots to only include dates within the requested range.
   * This is necessary because buildDateRanges uses a ±1 day buffer when checking
   * if date overrides should be included (to handle timezone edge cases), which can
   * cause slots from adjacent days to leak into the response.
   */
  private _filterSlotsByRequestedDateRange<
    T extends Record<string, { time: string; attendees?: number; bookingUid?: string }[]>,
  >({
    slotsMappedToDate,
    startTime,
    endTime,
    timeZone,
  }: {
    slotsMappedToDate: T;
    startTime: string;
    endTime: string;
    timeZone: string | undefined;
  }): T {
    if (!timeZone) {
      return slotsMappedToDate;
    }
    const inputStartTime = dayjs(startTime).tz(timeZone);
    const inputEndTime = dayjs(endTime).tz(timeZone);

    // fr-CA uses YYYY-MM-DD format
    const formatter = new Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timeZone,
    });

    const allowedDates = new Set<string>();
    for (let d = inputStartTime.startOf("day"); !d.isAfter(inputEndTime, "day"); d = d.add(1, "day")) {
      allowedDates.add(formatter.format(d.toDate()));
    }

    const filtered = {} as T;
    for (const [date, slots] of Object.entries(slotsMappedToDate)) {
      if (allowedDates.has(date)) {
        (filtered as Record<string, typeof slots>)[date] = slots;
      }
    }
    return filtered;
  }
  private filterSlotsByRequestedDateRange = withReporting(
    this._filterSlotsByRequestedDateRange.bind(this),
    "filterSlotsByRequestedDateRange"
  );

  private _getAllDatesWithBookabilityStatus(availableDates: string[]) {
    if (availableDates.length === 0) {
      return {};
    }

    const availableDatesSet = new Set(availableDates);
    const firstDate = dayjs(availableDates[0]);
    const lastDate = dayjs(availableDates[availableDates.length - 1]);
    const allDates: Record<string, { isBookable: boolean }> = {};

    let currentDate = firstDate;
    while (currentDate <= lastDate) {
      allDates[currentDate.format("YYYY-MM-DD")] = {
        isBookable: availableDatesSet.has(currentDate.format("YYYY-MM-DD")),
      };

      currentDate = currentDate.add(1, "day");
    }
    return allDates;
  }

  private getAllDatesWithBookabilityStatus = withReporting(
    this._getAllDatesWithBookabilityStatus.bind(this),
    "getAllDatesWithBookabilityStatus"
  );

  private async getUserIdFromUsername(
    username: string,
    organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
  ) {
    const { currentOrgDomain, isValidOrgDomain } = organizationDetails;
    log.info("getUserIdFromUsername", safeStringify({ organizationDetails, username }));
    const userRepo = this.dependencies.userRepo;
    const [user] = await userRepo.findUsersByUsername({
      usernameList: [username],
      orgSlug: isValidOrgDomain ? currentOrgDomain : null,
    });
    return user?.id;
  }

  private async getEventTypeId({
    slug,
    eventTypeSlug,
    isTeamEvent,
    organizationDetails,
  }: {
    slug?: string;
    eventTypeSlug?: string;
    isTeamEvent: boolean;
    organizationDetails?: { currentOrgDomain: string | null; isValidOrgDomain: boolean };
  }) {
    if (!eventTypeSlug || !slug) return null;

    let teamId: number | undefined;
    let userId: number | undefined;
    if (isTeamEvent) {
      teamId = await this.getTeamIdFromSlug(
        slug,
        organizationDetails ?? { currentOrgDomain: null, isValidOrgDomain: false }
      );
    } else {
      userId = await this.getUserIdFromUsername(
        slug,
        organizationDetails ?? { currentOrgDomain: null, isValidOrgDomain: false }
      );
    }
    const eventTypeRepo = this.dependencies.eventTypeRepo;
    const eventType = await eventTypeRepo.findFirstEventTypeId({ slug: eventTypeSlug, teamId, userId });
    if (!eventType) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return eventType?.id;
  }

  private async getTeamIdFromSlug(
    slug: string,
    organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
  ) {
    const { currentOrgDomain, isValidOrgDomain } = organizationDetails;
    const teamRepo = this.dependencies.teamRepo;
    const team = await teamRepo.findFirstBySlugAndParentSlug({
      slug,
      parentSlug: isValidOrgDomain && currentOrgDomain ? currentOrgDomain : null,
      select: { id: true },
    });

    return team?.id;
  }

  private async _getBusyTimesFromLimitsForUsers(
    users: { id: number; email: string }[],
    bookingLimits: IntervalLimit | null,
    durationLimits: IntervalLimit | null,
    dateFrom: Dayjs,
    dateTo: Dayjs,
    duration: number | undefined,
    eventType: NonNullable<EventType>,
    timeZone: string,
    rescheduleUid?: string
  ) {
    const userBusyTimesMap = new Map<number, EventBusyDetails[]>();

    if (!bookingLimits && !durationLimits) {
      return userBusyTimesMap;
    }

    const { limitDateFrom, limitDateTo } = this.dependencies.busyTimesService.getStartEndDateforLimitCheck(
      dateFrom.toISOString(),
      dateTo.toISOString(),
      bookingLimits || durationLimits
    );

    const busyTimesFromLimitsBookings = await this.dependencies.busyTimesService.getBusyTimesForLimitChecks({
      userIds: users.map((user) => user.id),
      eventTypeId: eventType.id,
      startDate: limitDateFrom.format(),
      endDate: limitDateTo.format(),
      rescheduleUid,
      bookingLimits,
      durationLimits,
    });

    const globalLimitManager = new LimitManager();

    if (bookingLimits) {
      for (const key of descendingLimitKeys) {
        const limit = bookingLimits?.[key];
        if (!limit) continue;

        const unit = intervalLimitKeyToUnit(key);
        const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
          dateFrom,
          dateTo,
          unit,
          timeZone
        );

        for (const periodStart of periodStartDates) {
          if (globalLimitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

          const periodEnd = periodStart.endOf(unit);
          let totalBookings = 0;

          const { title, source } = LimitSources.eventBookingLimit({ limit, unit });

          for (const booking of busyTimesFromLimitsBookings) {
            if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
              continue;
            }

            totalBookings++;
            if (totalBookings >= limit) {
              globalLimitManager.addBusyTime({
                start: periodStart,
                unit,
                timeZone,
                title,
                source,
              });
              break;
            }
          }
        }
      }
    }

    // Pre-fetch yearly duration totals per event type to avoid N+1 queries
    const yearlyDurationTotals = new Map<string, number>();
    const missingYearlyDurationTotals = new Set<string>();
    if (durationLimits?.PER_YEAR) {
      const yearPeriodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
        dateFrom,
        dateTo,
        "year",
        timeZone
      );
      for (const periodStart of yearPeriodStartDates) {
        const yearKey = periodStart.format("YYYY");
        const totalDurationForYear = await this.dependencies.bookingRepo.getTotalBookingDuration({
          eventId: eventType.id,
          startDate: periodStart.toDate(),
          endDate: periodStart.endOf("year").toDate(),
          rescheduleUid,
        });
        yearlyDurationTotals.set(yearKey, totalDurationForYear);
      }
    }

    for (const user of users) {
      const userBookings = busyTimesFromLimitsBookings.filter((booking) => booking.userId === user.id);
      const limitManager = new LimitManager();

      limitManager.mergeBusyTimes(globalLimitManager);

      if (bookingLimits) {
        for (const key of descendingLimitKeys) {
          const limit = bookingLimits?.[key];
          if (!limit) continue;

          const unit = intervalLimitKeyToUnit(key);
          const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
            dateFrom,
            dateTo,
            unit,
            timeZone
          );

          for (const periodStart of periodStartDates) {
            if (limitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

            const { title, source } = LimitSources.eventBookingLimit({ limit, unit });

            if (unit === "year") {
              try {
                await this.dependencies.checkBookingLimitsService.checkBookingLimit({
                  eventStartDate: periodStart.toDate(),
                  limitingNumber: limit,
                  eventId: eventType.id,
                  key,
                  user,
                  rescheduleUid,
                  timeZone,
                });
              } catch {
                limitManager.addBusyTime({
                  start: periodStart,
                  unit,
                  timeZone,
                  title,
                  source,
                });
                if (
                  periodStartDates.every((start: Dayjs) => limitManager.isAlreadyBusy(start, unit, timeZone))
                ) {
                  break;
                }
              }
              continue;
            }

            const periodEnd = periodStart.endOf(unit);
            let totalBookings = 0;

            for (const booking of userBookings) {
              if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
                continue;
              }

              totalBookings++;
              if (totalBookings >= limit) {
                limitManager.addBusyTime({
                  start: periodStart,
                  unit,
                  timeZone,
                  title,
                  source,
                });
                break;
              }
            }
          }
        }
      }

      if (durationLimits) {
        for (const key of descendingLimitKeys) {
          const limit = durationLimits?.[key];
          if (!limit) continue;

          const unit = intervalLimitKeyToUnit(key);
          const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
            dateFrom,
            dateTo,
            unit,
            timeZone
          );

          for (const periodStart of periodStartDates) {
            if (limitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

            const selectedDuration = (duration || eventType.length) ?? 0;

            const { title, source } = LimitSources.eventDurationLimit({ limit, unit });

            if (selectedDuration > limit) {
              limitManager.addBusyTime({
                start: periodStart,
                unit,
                timeZone,
                title,
                source,
              });
              continue;
            }

            if (unit === "year") {
              const yearKey = periodStart.format("YYYY");
              if (!yearlyDurationTotals.has(yearKey) && !missingYearlyDurationTotals.has(yearKey)) {
                missingYearlyDurationTotals.add(yearKey);
                log.warn("[DURATION LIMIT CACHE MISS] Missing pre-fetched yearly duration total", {
                  eventTypeId: eventType.id,
                  durationLimitKey: key,
                  yearKey,
                  dateFrom: dateFrom.toISOString(),
                  dateTo: dateTo.toISOString(),
                  timeZone,
                });
              }
              const totalYearlyDuration = yearlyDurationTotals.get(yearKey) ?? 0;
              if (totalYearlyDuration + selectedDuration > limit) {
                limitManager.addBusyTime({
                  start: periodStart,
                  unit,
                  timeZone,
                  title,
                  source,
                });
                if (
                  periodStartDates.every((start: Dayjs) => limitManager.isAlreadyBusy(start, unit, timeZone))
                ) {
                  break;
                }
              }
              continue;
            }

            const periodEnd = periodStart.endOf(unit);
            let totalDuration = selectedDuration;

            for (const booking of userBookings) {
              if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
                continue;
              }
              totalDuration += dayjs(booking.end).diff(dayjs(booking.start), "minute");
              if (totalDuration > limit) {
                limitManager.addBusyTime({
                  start: periodStart,
                  unit,
                  timeZone,
                  title,
                  source,
                });
                break;
              }
            }
          }
        }
      }

      userBusyTimesMap.set(user.id, limitManager.getBusyTimes());
    }

    return userBusyTimesMap;
  }

  private getBusyTimesFromLimitsForUsers = withReporting(
    this._getBusyTimesFromLimitsForUsers.bind(this),
    "getBusyTimesFromLimitsForUsers"
  );

  private async _getBusyTimesFromTeamLimitsForUsers(
    users: { id: number; email: string }[],
    bookingLimits: IntervalLimit,
    dateFrom: Dayjs,
    dateTo: Dayjs,
    teamId: number,
    includeManagedEvents: boolean,
    timeZone: string,
    rescheduleUid?: string
  ) {
    const { limitDateFrom, limitDateTo } = this.dependencies.busyTimesService.getStartEndDateforLimitCheck(
      dateFrom.toISOString(),
      dateTo.toISOString(),
      bookingLimits
    );

    const bookingRepo = this.dependencies.bookingRepo;
    const bookings = await bookingRepo.getAllAcceptedTeamBookingsOfUsers({
      users,
      teamId,
      startDate: limitDateFrom.toDate(),
      endDate: limitDateTo.toDate(),
      excludedUid: rescheduleUid,
      includeManagedEvents,
    });

    const busyTimes = bookings.map(({ id, startTime, endTime, eventTypeId, title, userId }) => ({
      start: dayjs(startTime).toDate(),
      end: dayjs(endTime).toDate(),
      title,
      source: `eventType-${eventTypeId}-booking-${id}`,
      userId,
    }));

    const globalLimitManager = new LimitManager();

    for (const key of descendingLimitKeys) {
      const limit = bookingLimits?.[key];
      if (!limit) continue;

      const unit = intervalLimitKeyToUnit(key);
      const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
        dateFrom,
        dateTo,
        unit,
        timeZone
      );

      for (const periodStart of periodStartDates) {
        if (globalLimitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

        const periodEnd = periodStart.endOf(unit);
        let totalBookings = 0;

        const { title, source } = LimitSources.teamBookingLimit({ limit, unit });

        for (const booking of busyTimes) {
          if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
            continue;
          }

          totalBookings++;
          if (totalBookings >= limit) {
            globalLimitManager.addBusyTime({
              start: periodStart,
              unit,
              timeZone,
              title,
              source,
            });
            break;
          }
        }
      }
    }

    const userBusyTimesMap = new Map();

    for (const user of users) {
      const userBusyTimes = busyTimes.filter((busyTime) => busyTime.userId === user.id);
      const limitManager = new LimitManager();

      limitManager.mergeBusyTimes(globalLimitManager);

      for (const key of descendingLimitKeys) {
        const limit = bookingLimits?.[key];
        if (!limit) continue;

        const unit = intervalLimitKeyToUnit(key);
        const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
          dateFrom,
          dateTo,
          unit,
          timeZone
        );

        for (const periodStart of periodStartDates) {
          if (limitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

          const { title, source } = LimitSources.teamBookingLimit({ limit, unit });

          if (unit === "year") {
            try {
              await this.dependencies.checkBookingLimitsService.checkBookingLimit({
                eventStartDate: periodStart.toDate(),
                limitingNumber: limit,
                key,
                teamId,
                user,
                rescheduleUid,
                includeManagedEvents,
                timeZone,
              });
            } catch {
              limitManager.addBusyTime({
                start: periodStart,
                unit,
                timeZone,
                title,
                source,
              });
              if (
                periodStartDates.every((start: Dayjs) => limitManager.isAlreadyBusy(start, unit, timeZone))
              ) {
                return;
              }
            }
            continue;
          }

          const periodEnd = periodStart.endOf(unit);
          let totalBookings = 0;

          for (const booking of userBusyTimes) {
            if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
              continue;
            }

            totalBookings++;
            if (totalBookings >= limit) {
              limitManager.addBusyTime({
                start: periodStart,
                unit,
                timeZone,
                title,
                source,
              });
              break;
            }
          }
        }
      }

      userBusyTimesMap.set(user.id, limitManager.getBusyTimes());
    }

    return userBusyTimesMap;
  }
  private getBusyTimesFromTeamLimitsForUsers = withReporting(
    this._getBusyTimesFromTeamLimitsForUsers.bind(this),
    "getBusyTimesFromTeamLimitsForUsers"
  );

  private async _getOOODates(startTimeDate: Date, endTimeDate: Date, allUserIds: number[]) {
    return this.dependencies.oooRepo.findManyOOO({ startTimeDate, endTimeDate, allUserIds });
  }
  private getOOODates = withReporting(this._getOOODates.bind(this), "getOOODates");

  private _getUsersWithCredentials({
    hosts,
  }: {
    hosts: {
      isFixed?: boolean;
      groupId?: string | null;
      overrideMinimumBookingNotice?: number | null;
      overrideBeforeEventBuffer?: number | null;
      overrideAfterEventBuffer?: number | null;
      overrideSlotInterval?: number | null;
      overrideBookingLimits?: Prisma.JsonValue | null;
      overrideDurationLimits?: Prisma.JsonValue | null;
      overridePeriodType?: PeriodType | null;
      overridePeriodStartDate?: Date | null;
      overridePeriodEndDate?: Date | null;
      overridePeriodDays?: number | null;
      overridePeriodCountCalendarDays?: boolean | null;
      user: GetAvailabilityUserWithDelegationCredentials;
    }[];
  }) {
    return hosts.map(
      ({
        isFixed,
        groupId,
        overrideMinimumBookingNotice,
        overrideBeforeEventBuffer,
        overrideAfterEventBuffer,
        overrideSlotInterval,
        overrideBookingLimits,
        overrideDurationLimits,
        overridePeriodType,
        overridePeriodStartDate,
        overridePeriodEndDate,
        overridePeriodDays,
        overridePeriodCountCalendarDays,
        user,
      }) => ({
        isFixed,
        groupId,
        overrideMinimumBookingNotice,
        overrideBeforeEventBuffer,
        overrideAfterEventBuffer,
        overrideSlotInterval,
        overrideBookingLimits,
        overrideDurationLimits,
        overridePeriodType,
        overridePeriodStartDate,
        overridePeriodEndDate,
        overridePeriodDays,
        overridePeriodCountCalendarDays,
        ...user,
      })
    );
  }

  private getUsersWithCredentials = withReporting(
    this._getUsersWithCredentials.bind(this),
    "getUsersWithCredentials"
  );

  private getStartTime(startTimeInput: string, timeZone?: string, minimumBookingNotice?: number) {
    const resolvedTimeZone = timeZone ?? "UTC";
    const startTimeMin = dayjs.utc().add(minimumBookingNotice || 1, "minutes");
    const startTime =
      resolvedTimeZone === "Etc/GMT"
        ? dayjs.utc(startTimeInput)
        : dayjs(startTimeInput).tz(resolvedTimeZone);

    return startTimeMin.isAfter(startTime) ? startTimeMin.tz(resolvedTimeZone) : startTime;
  }

  private hasRoundRobinHostLimitOverrides(users: OverrideAwareAvailabilityUser[]) {
    return (
      users.length > 0 &&
      users.some((user) => getRoundRobinHostLimitOverrides(user)) &&
      users.some((user) => user.isFixed !== true)
    );
  }

  private getEffectiveMinimumBookingNoticeForHosts({
    eventType,
    hosts,
  }: {
    eventType: AvailableSlotsEventType;
    hosts: OverrideAwareHost[];
  }) {
    if (eventType.schedulingType !== SchedulingType.ROUND_ROBIN || hosts.length === 0) {
      return eventType.minimumBookingNotice;
    }

    const eventLevelLimits = getEventLevelLimits(eventType);

    return Math.min(
      ...hosts.map((host) =>
        resolveRoundRobinHostEffectiveLimits({
          schedulingType: eventType.schedulingType,
          eventLimits: eventLevelLimits,
          hostOverrides: getRoundRobinHostLimitOverrides(host),
        }).minimumBookingNotice
      )
    );
  }

  private getRoundRobinOverrideAwareSlots({
    input,
    eventType,
    allUsersAvailability,
    effectiveLimitsByUserId,
    startTime,
    eventTimeZone,
  }: {
    input: TGetScheduleInputSchema;
    eventType: AvailableSlotsEventType;
    allUsersAvailability: {
      timeZone: string;
      dateRanges: DateRange[];
      oooExcludedDateRanges: DateRange[];
      user: OverrideAwareAvailabilityUser;
      datesOutOfOffice?: Record<string, unknown>;
    }[];
    effectiveLimitsByUserId: Map<number, EffectiveHostLimits>;
    startTime: Dayjs;
    eventTimeZone: string | undefined;
  }) {
    const eventLength = input.duration || eventType.length;
    const bookerUtcOffset = input.timeZone ? (getUTCOffsetByTimezone(input.timeZone) ?? 0) : 0;

    const slotMapsByUser = allUsersAvailability.map((availability) => {
      const effectiveLimits = effectiveLimitsByUserId.get(availability.user.id) ?? getEventLevelLimits(eventType);
      const userSlots = getSlots({
        inviteeDate: startTime,
        eventLength,
        offsetStart: eventType.offsetStart,
        dateRanges: availability.oooExcludedDateRanges,
        minimumBookingNotice: effectiveLimits.minimumBookingNotice,
        frequency: effectiveLimits.slotInterval || input.duration || eventType.length,
        showOptimizedSlots: eventType.showOptimizedSlots,
      });
      const slotsMappedToDate = userSlots.reduce<Record<string, { isBookable: boolean }>>((acc, slot) => {
        const dateString = slot.time.tz(input.timeZone ?? "UTC").format("YYYY-MM-DD");
        acc[dateString] = { isBookable: true };
        return acc;
      }, {});
      const allDatesWithBookabilityStatus = this.getAllDatesWithBookabilityStatus(
        Object.keys(slotsMappedToDate)
      );
      const periodLimits = calculatePeriodLimits({
        periodType: effectiveLimits.periodType,
        periodDays: effectiveLimits.periodDays,
        periodCountCalendarDays: effectiveLimits.periodCountCalendarDays,
        periodStartDate: effectiveLimits.periodStartDate,
        periodEndDate: effectiveLimits.periodEndDate,
        allDatesWithBookabilityStatusInBookerTz: allDatesWithBookabilityStatus,
        eventUtcOffset: getUTCOffsetByTimezone(eventTimeZone ?? "UTC") ?? 0,
        bookerUtcOffset,
      });
      const filteredUserSlots = userSlots.filter(
        (slot) =>
          !isTimeViolatingFutureLimit({
            time: slot.time.toISOString(),
            periodLimits,
          })
      );

      return {
        isFixed: availability.user.isFixed === true,
        groupId: availability.user.groupId ?? null,
        slotMap: new Map(filteredUserSlots.map((slot) => [getSlotKey(slot), slot])),
      };
    });

    const fixedSlotMaps = slotMapsByUser.filter((slotMap) => slotMap.isFixed).map((slotMap) => slotMap.slotMap);
    const roundRobinSlotMapsByGroup = slotMapsByUser
      .filter((slotMap) => !slotMap.isFixed)
      .reduce(
        (groupedSlotMaps, slotMap) => {
          const groupId = slotMap.groupId ?? DEFAULT_GROUP_ID;
          groupedSlotMaps[groupId] = groupedSlotMaps[groupId] ?? [];
          groupedSlotMaps[groupId].push(slotMap.slotMap);
          return groupedSlotMaps;
        },
        {} as Record<string, Map<string, SlotResult>[]>
      );

    let mergedSlotMap: Map<string, SlotResult> | null = null;

    if (fixedSlotMaps.length > 0) {
      mergedSlotMap = fixedSlotMaps.slice(1).reduce(intersectSlotMaps, fixedSlotMaps[0]);
    }

    Object.values(roundRobinSlotMapsByGroup).forEach((slotMaps) => {
      const groupSlotMap = mergeSlotMaps(slotMaps);
      mergedSlotMap = mergedSlotMap ? intersectSlotMaps(mergedSlotMap, groupSlotMap) : groupSlotMap;
    });

    return Array.from(mergedSlotMap?.values() ?? []).sort((leftSlot, rightSlot) => {
      return leftSlot.time.valueOf() - rightSlot.time.valueOf();
    });
  }

  private async calculateHostsAndAvailabilities({
    input,
    eventType,
    hosts,
    loggerWithEventDetails,
    startTime,
    endTime,
    bypassBusyCalendarTimes,
    silentCalendarFailures,
    mode,
  }: {
    input: TGetScheduleInputSchema;
    eventType: Exclude<
      Awaited<ReturnType<(typeof AvailableSlotsService)["prototype"]["getRegularOrDynamicEventType"]>>,
      null
    >;
    hosts: OverrideAwareHost[];
    loggerWithEventDetails: Logger<unknown>;
    startTime: ReturnType<(typeof AvailableSlotsService)["prototype"]["getStartTime"]>;
    endTime: Dayjs;
    bypassBusyCalendarTimes: boolean;
    silentCalendarFailures: boolean;
    mode?: CalendarFetchMode;
  }) {
    const usersWithCredentials = this.getUsersWithCredentials({
      hosts,
    }) as OverrideAwareAvailabilityUser[];

    loggerWithEventDetails.debug("Using users", {
      usersWithCredentials: usersWithCredentials.map((user) => user.email),
    });

    const durationToUse = input.duration || 0;
    let currentSeats: CurrentSeats | undefined;

    const startTimeDate =
      input.rescheduleUid && durationToUse
        ? startTime.subtract(durationToUse, "minute").toDate()
        : startTime.toDate();

    const endTimeDate =
      input.rescheduleUid && durationToUse ? endTime.add(durationToUse, "minute").toDate() : endTime.toDate();

    const userIdAndEmailMap = new Map(usersWithCredentials.map((user) => [user.id, user.email]));
    const allUserIds = Array.from(userIdAndEmailMap.keys());

    const bookingRepo = this.dependencies.bookingRepo;
    const [currentBookingsAllUsers, outOfOfficeDaysAllUsers] = await Promise.all([
      bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: startTimeDate,
        endDate: endTimeDate,
        eventTypeId: eventType.id,
        seatedEvent: Boolean(eventType.seatsPerTimeSlot),
        userIdAndEmailMap,
      }),
      this.getOOODates(startTimeDate, endTimeDate, allUserIds),
    ]);

    const bookingLimits =
      eventType?.bookingLimits &&
      typeof eventType?.bookingLimits === "object" &&
      Object.keys(eventType?.bookingLimits).length > 0
        ? parseBookingLimit(eventType?.bookingLimits)
        : null;

    const durationLimits =
      eventType?.durationLimits &&
      typeof eventType?.durationLimits === "object" &&
      Object.keys(eventType?.durationLimits).length > 0
        ? parseDurationLimit(eventType?.durationLimits)
        : null;
    const eventLevelLimits = getEventLevelLimits(eventType);
    const hasRoundRobinHostLimitOverrides = this.hasRoundRobinHostLimitOverrides(usersWithCredentials);

    let busyTimesFromLimitsBookingsAllUsers: Awaited<
      ReturnType<typeof getBusyTimesService.prototype.getBusyTimesForLimitChecks>
    > = [];

    if (!hasRoundRobinHostLimitOverrides && eventType && (bookingLimits || durationLimits)) {
      busyTimesFromLimitsBookingsAllUsers =
        await this.dependencies.busyTimesService.getBusyTimesForLimitChecks({
          userIds: allUserIds,
          eventTypeId: eventType.id,
          startDate: startTime.format(),
          endDate: endTime.format(),
          rescheduleUid: input.rescheduleUid,
          bookingLimits,
          durationLimits,
        });
    }

    let busyTimesFromLimitsMap: Map<number, EventBusyDetails[]> | undefined;
    if (!hasRoundRobinHostLimitOverrides && eventType && (bookingLimits || durationLimits)) {
      const usersForLimits = usersWithCredentials.map((user) => ({ id: user.id, email: user.email }));
      const eventTimeZone = eventType.schedule?.timeZone ?? usersWithCredentials[0]?.timeZone ?? "UTC";
      busyTimesFromLimitsMap = await this.getBusyTimesFromLimitsForUsers(
        usersForLimits,
        bookingLimits,
        durationLimits,
        startTime,
        endTime,
        typeof input.duration === "number" ? input.duration : undefined,
        eventType,
        eventTimeZone,
        input.rescheduleUid || undefined
      );
    }

    const teamForBookingLimits =
      eventType?.team ??
      (eventType?.parent?.team?.includeManagedEventsInLimits ? eventType?.parent?.team : null);

    const teamBookingLimits = parseBookingLimit(teamForBookingLimits?.bookingLimits);

    let teamBookingLimitsMap: Map<number, EventBusyDetails[]> | undefined;
    if (teamForBookingLimits && teamBookingLimits) {
      const usersForTeamLimits = usersWithCredentials.map((user) => ({ id: user.id, email: user.email }));
      const eventTimeZone = eventType.schedule?.timeZone ?? usersWithCredentials[0]?.timeZone ?? "UTC";
      teamBookingLimitsMap = await this.getBusyTimesFromTeamLimitsForUsers(
        usersForTeamLimits,
        teamBookingLimits,
        startTime,
        endTime,
        teamForBookingLimits.id,
        teamForBookingLimits.includeManagedEventsInLimits,
        eventTimeZone,
        input.rescheduleUid || undefined
      );
    }

    function _enrichUsersWithData() {
      return usersWithCredentials.map((currentUser) => {
        return {
          ...currentUser,
          currentBookings: currentBookingsAllUsers
            .filter(
              (b) => b.userId === currentUser.id || b.attendees?.some((a) => a.email === currentUser.email)
            )
            .map((bookings) => {
              const { attendees: _attendees, ...bookingWithoutAttendees } = bookings;
              return bookingWithoutAttendees;
            }),
          outOfOfficeDays: outOfOfficeDaysAllUsers.filter((o) => o.user.id === currentUser.id),
        };
      });
    }
    const enrichUsersWithData = withReporting(_enrichUsersWithData.bind(this), "enrichUsersWithData");
    const users = enrichUsersWithData();
    const effectiveLimitsByUserId = new Map<number, EffectiveHostLimits>(
      users.map((user) => [user.id, eventLevelLimits])
    );

    const premappedUsersAvailability = hasRoundRobinHostLimitOverrides
      ? await (async () => {
          const busyTimesFromLimitsByUserId = new Map<number, EventBusyDetails[]>();
          const limitBuckets = groupRoundRobinHostsByEffectiveLimits({
            schedulingType: eventType.schedulingType,
            eventLimits: eventLevelLimits,
            hosts: users,
            getHostOverrides: getRoundRobinHostLimitOverrides,
          });

          for (const bucket of limitBuckets) {
            const parsedBucketBookingLimits = parseBookingLimit(bucket.effectiveLimits.bookingLimits);
            const parsedBucketDurationLimits = parseDurationLimit(bucket.effectiveLimits.durationLimits);

            let bucketBookings: EventBusyDetails[] = [];
            if (parsedBucketBookingLimits || parsedBucketDurationLimits) {
              const { limitDateFrom, limitDateTo } =
                this.dependencies.busyTimesService.getStartEndDateforLimitCheck(
                  startTime.toISOString(),
                  endTime.toISOString(),
                  parsedBucketBookingLimits,
                  parsedBucketDurationLimits
                );

              bucketBookings = await this.dependencies.busyTimesService.getBusyTimesForLimitChecks({
                userIds: bucket.hosts.map((user) => user.id),
                eventTypeId: eventType.id,
                startDate: limitDateFrom.format(),
                endDate: limitDateTo.format(),
                rescheduleUid: input.rescheduleUid,
                bookingLimits: parsedBucketBookingLimits,
                durationLimits: parsedBucketDurationLimits,
              });
            }

            bucket.hosts.forEach((user) => {
              effectiveLimitsByUserId.set(user.id, bucket.effectiveLimits);
              busyTimesFromLimitsByUserId.set(
                user.id,
                bucketBookings.filter((booking) => booking.userId === user.id)
              );
            });
          }

          const availabilityByUserId = new Map<
            number,
            Awaited<ReturnType<(typeof this.dependencies.userAvailabilityService)["getUsersAvailability"]>>[number]
          >();

          for (const bucket of limitBuckets) {
            const effectiveEventType = buildEventTypeWithEffectiveLimits({
              eventType,
              effectiveLimits: bucket.effectiveLimits,
            });

            const bucketBusyTimesFromLimits = new Map<number, EventBusyDetails[]>();
            bucket.hosts.forEach((user) => {
              bucketBusyTimesFromLimits.set(user.id, busyTimesFromLimitsByUserId.get(user.id) ?? []);
            });

            const bucketAvailability = await this.dependencies.userAvailabilityService.getUsersAvailability({
              users: bucket.hosts,
              query: {
                dateFrom: startTime.format(),
                dateTo: endTime.format(),
                eventTypeId: eventType.id,
                afterEventBuffer: bucket.effectiveLimits.afterEventBuffer,
                beforeEventBuffer: bucket.effectiveLimits.beforeEventBuffer,
                duration: input.duration || 0,
                returnDateOverrides: false,
                bypassBusyCalendarTimes,
                silentlyHandleCalendarFailures: silentCalendarFailures,
                mode,
              },
              initialData: {
                eventType: effectiveEventType,
                currentSeats,
                rescheduleUid: input.rescheduleUid,
                busyTimesFromLimits: bucketBusyTimesFromLimits,
                eventTypeForLimits: effectiveEventType,
                teamBookingLimits: teamBookingLimitsMap,
                teamForBookingLimits,
              },
            });

            bucket.hosts.forEach((user, index) => {
              const availability = bucketAvailability[index];
              if (availability) {
                availabilityByUserId.set(user.id, availability);
              }
            });
          }

          return users.map((user) => {
            const availability = availabilityByUserId.get(user.id);
            if (!availability) {
              throw new Error(`Missing availability for user ${user.id}`);
            }
            return availability;
          });
        })()
      : await this.dependencies.userAvailabilityService.getUsersAvailability({
          users,
          query: {
            dateFrom: startTime.format(),
            dateTo: endTime.format(),
            eventTypeId: eventType.id,
            afterEventBuffer: eventType.afterEventBuffer,
            beforeEventBuffer: eventType.beforeEventBuffer,
            duration: input.duration || 0,
            returnDateOverrides: false,
            bypassBusyCalendarTimes,
            silentlyHandleCalendarFailures: silentCalendarFailures,
            mode,
          },
          initialData: {
            eventType,
            currentSeats,
            rescheduleUid: input.rescheduleUid,
            busyTimesFromLimitsBookings: busyTimesFromLimitsBookingsAllUsers,
            busyTimesFromLimits: busyTimesFromLimitsMap,
            eventTypeForLimits: eventType && (bookingLimits || durationLimits) ? eventType : null,
            teamBookingLimits: teamBookingLimitsMap,
            teamForBookingLimits: teamForBookingLimits,
          },
        });
    /* We get all users working hours and busy slots */
    const allUsersAvailability = premappedUsersAvailability.map(
      (
        { busy, dateRanges, oooExcludedDateRanges, currentSeats: _currentSeats, timeZone, datesOutOfOffice },
        index
      ) => {
        const currentUser = users[index];
        if (!currentSeats && _currentSeats) currentSeats = _currentSeats;
        return {
          timeZone,
          dateRanges,
          oooExcludedDateRanges,
          busy,
          user: currentUser,
          datesOutOfOffice,
        };
      }
    );

    return {
      allUsersAvailability,
      usersWithCredentials,
      currentSeats,
      effectiveLimitsByUserId,
      hasRoundRobinHostLimitOverrides,
    };
  }

  private async checkRestrictionScheduleEnabled(teamId?: number): Promise<boolean> {
    if (!teamId) {
      return false;
    }

    return await this.dependencies.featuresRepo.checkIfTeamHasFeature(teamId, "restriction-schedule");
  }

  /**
   * Resolves the organization ID for watchlist blocking with the following priority:
   * 1. Request context (orgSlug) - most accurate for the current request scope
   * 2. EventType team hierarchy - for team/managed events
   * 3. User's org membership - fallback for personal events of org members
   *
   * This ensures org-scoped blocking works correctly for:
   * - Team events under an org
   * - Managed events (child events of org team event types)
   * - Personal events of org members accessed via org domain
   */
  private async resolveOrganizationIdForBlocking({
    orgDetails,
    eventType,
  }: {
    orgDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean };
    eventType: {
      parent?: { team?: { parentId: number | null } | null } | null;
      team?: { parentId: number | null } | null;
      userId: number | null;
    };
  }): Promise<number | null> {
    if (orgDetails.isValidOrgDomain && orgDetails.currentOrgDomain) {
      const orgId = await this.dependencies.teamRepo.findOrganizationIdBySlug({
        slug: orgDetails.currentOrgDomain,
      });
      if (orgId) {
        return orgId;
      }
    }

    // EventType team hierarchy - for team/managed events
    const eventTypeOrgId = eventType.parent?.team?.parentId ?? eventType.team?.parentId ?? null;
    if (eventTypeOrgId) {
      return eventTypeOrgId;
    }

    // User's org membership - fallback for personal events of org members
    // This is a heuristic and uses the first org membership.
    // TODO:When multi-org is supported, revisit.
    if (eventType.userId) {
      return await this.dependencies.orgMembershipLookup.findFirstOrganizationIdForUser({
        userId: eventType.userId,
      });
    }

    return null;
  }

  private async _getRegularOrDynamicEventType(
    input: TGetScheduleInputSchema,
    organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
  ) {
    const isDynamicBooking = input.usernameList && input.usernameList.length > 1;
    return isDynamicBooking
      ? await this.getDynamicEventType(input, organizationDetails)
      : await this.getEventType(input, organizationDetails);
  }

  private getRegularOrDynamicEventType = withReporting(
    this._getRegularOrDynamicEventType.bind(this),
    "getRegularOrDynamicEventType"
  );

  getAvailableSlots = withReporting(
    withSlotsCache(this.dependencies.redisClient, this._getAvailableSlots.bind(this)),
    "getAvailableSlots"
  );

  async _getAvailableSlots({ input, ctx }: GetScheduleOptions): Promise<IGetAvailableSlots> {
    const {
      _enableTroubleshooter: enableTroubleshooter = false,
      _bypassCalendarBusyTimes: bypassBusyCalendarTimes = false,
      _silentCalendarFailures: silentCalendarFailures = false,
      routingFormResponseId,
      queuedFormResponseId,
    } = input;
    const orgDetails = input?.orgSlug
      ? {
          currentOrgDomain: input.orgSlug,
          isValidOrgDomain: !!input.orgSlug && !RESERVED_SUBDOMAINS.includes(input.orgSlug),
        }
      : orgDomainConfig(ctx?.req);

    if (process.env.INTEGRATION_TEST_MODE === "true") {
      logger.settings.minLevel = 2;
    }

    const eventType = await this.getRegularOrDynamicEventType(input, orgDetails);

    if (!eventType) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const eventTimeZone = eventType.timeZone ?? eventType.schedule?.timeZone ?? "UTC";

    // Use "slots" mode to enable cache when available for getting calendar availability
    const mode: CalendarFetchMode = "slots";
    if (isEventTypeLoggingEnabled({ eventTypeId: eventType.id })) {
      logger.settings.minLevel = 2;
    }

    const isRollingWindowPeriodType = eventType.periodType === PeriodType.ROLLING_WINDOW;
    const startTimeAsIsoString = input.startTime;
    const isStartTimeInPast = dayjs(startTimeAsIsoString).isBefore(dayjs().subtract(1, "day").startOf("day"));

    // If startTime is already sent in the past, we don't need to adjust it.
    // We assume that the client is already sending startTime as per their requirement.
    // Note: We could optimize it further to go back 1 month in past only for the 2nd month because that is what we are putting a hard limit at.
    const startTimeAdjustedForRollingWindowComputation =
      isStartTimeInPast || !isRollingWindowPeriodType
        ? startTimeAsIsoString
        : dayjs(startTimeAsIsoString).subtract(1, "month").toISOString();

    const loggerWithEventDetails = logger.getSubLogger({
      type: "json",
      prefix: ["getAvailableSlots", `${eventType.id}:${input.usernameList}/${input.eventTypeSlug}`],
    });

    const endTime =
      input.timeZone === "Etc/GMT" ? dayjs.utc(input.endTime) : dayjs(input.endTime).utc().tz(input.timeZone);
    // when an empty array is given we should prefer to have it handled as if this wasn't given at all
    // we don't want to return no availability in this case.
    const routedTeamMemberIds = input.routedTeamMemberIds ?? [];
    const contactOwnerEmailFromInput = input.teamMemberEmail ?? null;

    const skipContactOwner = shouldIgnoreContactOwner({
      skipContactOwner: input.skipContactOwner ?? null,
      rescheduleUid: input.rescheduleUid ?? null,
      routedTeamMemberIds: input.routedTeamMemberIds ?? null,
    });

    const contactOwnerEmail = skipContactOwner ? null : contactOwnerEmailFromInput;

    let routingFormResponse = null;
    if (routingFormResponseId) {
      const formResponseRepo = this.dependencies.routingFormResponseRepo;
      routingFormResponse = await formResponseRepo.findFormResponseIncludeForm({
        routingFormResponseId,
      });
    } else if (queuedFormResponseId) {
      const formResponseRepo = this.dependencies.routingFormResponseRepo;
      routingFormResponse = await formResponseRepo.findQueuedFormResponseIncludeForm({
        queuedFormResponseId,
      });
    }
    const { qualifiedRRHosts, allFallbackRRHosts, fixedHosts } =
      await this.dependencies.qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
        eventType,
        rescheduleUid: input.rescheduleUid ?? null,
        routedTeamMemberIds,
        contactOwnerEmail,
        routingFormResponse,
        rrHostSubsetIds: input.rrHostSubsetIds ?? undefined,
      });

    // Filter out blocked hosts BEFORE calculating availability (batched - single DB query)

    const organizationId = await this.resolveOrganizationIdForBlocking({
      orgDetails,
      eventType,
    });

    const { eligibleHosts: eligibleQualifiedRRHosts } = await filterBlockedHosts(
      qualifiedRRHosts,
      organizationId
    );
    const { eligibleHosts: eligibleFixedHosts } = await filterBlockedHosts(fixedHosts, organizationId);
    const { eligibleHosts: eligibleFallbackRRHosts } = allFallbackRRHosts
      ? await filterBlockedHosts(allFallbackRRHosts, organizationId)
      : { eligibleHosts: [] };

    const allHosts = [...eligibleQualifiedRRHosts, ...eligibleFixedHosts];

    // If all hosts are blocked, return empty slots
    if (allHosts.length === 0) {
      loggerWithEventDetails.info("All hosts are blocked by watchlist, returning empty slots");
      return {
        slots: {},
      };
    }

    const getStartTimeForHosts = (
      startTimeInput: string,
      hostsForStartTime: typeof allHosts
    ) =>
      this.getStartTime(
        startTimeInput,
        input.timeZone,
        this.getEffectiveMinimumBookingNoticeForHosts({
          eventType,
          hosts: hostsForStartTime,
        })
      );

    const startTime = getStartTimeForHosts(startTimeAdjustedForRollingWindowComputation, allHosts);
    const twoWeeksFromNow = dayjs().add(2, "week");

    const hasFallbackRRHosts =
      eligibleFallbackRRHosts.length > 0 && eligibleFallbackRRHosts.length > eligibleQualifiedRRHosts.length;

    let {
      allUsersAvailability,
      usersWithCredentials,
      currentSeats,
      effectiveLimitsByUserId,
      hasRoundRobinHostLimitOverrides,
    } =
      await this.calculateHostsAndAvailabilities({
        input,
        eventType,
        hosts: allHosts,
        loggerWithEventDetails,
        // adjust start time so we can check for available slots in the first two weeks
        startTime:
          hasFallbackRRHosts && startTime.isBefore(twoWeeksFromNow)
            ? getStartTimeForHosts(dayjs().format(), allHosts)
            : startTime,
        // adjust end time so we can check for available slots in the first two weeks
        endTime:
          hasFallbackRRHosts && endTime.isBefore(twoWeeksFromNow)
            ? getStartTimeForHosts(twoWeeksFromNow.format(), allHosts)
            : endTime,
        bypassBusyCalendarTimes,
        silentCalendarFailures,
        mode,
      });

    const generateSlotsForHosts = ({
      allUsersAvailability: availabilityByHost,
      effectiveLimitsByUserId: effectiveLimitsByHost,
      hasRoundRobinHostLimitOverrides: hasOverrides,
      slotsStartTime,
      inviteeDateForStandardSlots = slotsStartTime,
      includeSingleHostOutOfOffice = true,
    }: {
      allUsersAvailability: typeof allUsersAvailability;
      effectiveLimitsByUserId: typeof effectiveLimitsByUserId;
      hasRoundRobinHostLimitOverrides: boolean;
      slotsStartTime: dayjs.Dayjs;
      inviteeDateForStandardSlots?: dayjs.Dayjs;
      includeSingleHostOutOfOffice?: boolean;
    }) => {
      const aggregatedAvailabilityForHosts = getAggregatedAvailability(
        availabilityByHost,
        eventType.schedulingType
      );
      const eventTimeZoneForHosts =
        eventType.timeZone || eventType.schedule?.timeZone || availabilityByHost[0]?.timeZone;

      const timeSlotsForHosts = hasOverrides
        ? this.getRoundRobinOverrideAwareSlots({
            input,
            eventType,
            allUsersAvailability: availabilityByHost,
            effectiveLimitsByUserId: effectiveLimitsByHost,
            startTime: slotsStartTime,
            eventTimeZone: eventTimeZoneForHosts,
          })
        : getSlots({
            inviteeDate: inviteeDateForStandardSlots,
            eventLength: input.duration || eventType.length,
            offsetStart: eventType.offsetStart,
            dateRanges: aggregatedAvailabilityForHosts,
            minimumBookingNotice: eventType.minimumBookingNotice,
            frequency: eventType.slotInterval || input.duration || eventType.length,
            datesOutOfOffice:
              includeSingleHostOutOfOffice &&
              eventType.schedulingType !== SchedulingType.COLLECTIVE &&
              eventType.schedulingType !== SchedulingType.ROUND_ROBIN &&
              availabilityByHost.length <= 1
                ? availabilityByHost[0]?.datesOutOfOffice
                : undefined,
            showOptimizedSlots: eventType.showOptimizedSlots,
            datesOutOfOfficeTimeZone:
              includeSingleHostOutOfOffice &&
              eventType.schedulingType !== SchedulingType.COLLECTIVE &&
              eventType.schedulingType !== SchedulingType.ROUND_ROBIN &&
              availabilityByHost.length <= 1
                ? availabilityByHost[0]?.timeZone
                : undefined,
          });

      return {
        aggregatedAvailability: aggregatedAvailabilityForHosts,
        timeSlots: timeSlotsForHosts,
      };
    };

    let { aggregatedAvailability, timeSlots } = generateSlotsForHosts({
      allUsersAvailability,
      effectiveLimitsByUserId,
      hasRoundRobinHostLimitOverrides,
      slotsStartTime: startTime,
      inviteeDateForStandardSlots: startTime,
      includeSingleHostOutOfOffice: true,
    });

    // Fairness and Contact Owner have fallbacks because we check for within 2 weeks
    if (hasFallbackRRHosts) {
      let diff = 0;
      if (startTime.isBefore(twoWeeksFromNow)) {
        //check if first two week have availability
        diff =
          timeSlots.length > 0
            ? timeSlots[0].time.diff(twoWeeksFromNow, "day")
            : 1; // no aggregatedAvailability so we diff to +1
      } else {
        // if start time is not within first two weeks, check if there are any available slots
        if (!timeSlots.length) {
          // if no available slots check if first two weeks are available, otherwise fallback
          const firstTwoWeeksHosts = [...eligibleQualifiedRRHosts, ...eligibleFixedHosts];
          const firstTwoWeeksStartTime = getStartTimeForHosts(dayjs().format(), firstTwoWeeksHosts);
          const firstTwoWeeksAvailabilities = await this.calculateHostsAndAvailabilities({
            input,
            eventType,
            hosts: firstTwoWeeksHosts,
            loggerWithEventDetails,
            startTime: firstTwoWeeksStartTime,
            endTime: getStartTimeForHosts(twoWeeksFromNow.format(), firstTwoWeeksHosts),
            bypassBusyCalendarTimes,
            silentCalendarFailures,
            mode,
          });
          const { timeSlots: firstTwoWeeksTimeSlots } = generateSlotsForHosts({
            allUsersAvailability: firstTwoWeeksAvailabilities.allUsersAvailability,
            effectiveLimitsByUserId: firstTwoWeeksAvailabilities.effectiveLimitsByUserId,
            hasRoundRobinHostLimitOverrides:
              firstTwoWeeksAvailabilities.hasRoundRobinHostLimitOverrides,
            slotsStartTime: firstTwoWeeksStartTime,
            inviteeDateForStandardSlots: firstTwoWeeksStartTime,
            includeSingleHostOutOfOffice: false,
          });
          if (!firstTwoWeeksTimeSlots.length) {
            diff = 1;
          }
        }
      }

      if (input.email) {
        loggerWithEventDetails.info({
          email: input.email,
          contactOwnerEmail,
          eligibleQualifiedRRHosts: eligibleQualifiedRRHosts.map((host) => host.user.id),
          eligibleFallbackRRHosts: eligibleFallbackRRHosts.map((host) => host.user.id),
          blockedHostsCount: qualifiedRRHosts.length - eligibleQualifiedRRHosts.length,
          fallBackActive: diff > 0,
        });
      }

      if (diff > 0) {
        // if the first available slot is more than 2 weeks from now, round robin as normal
        const fallbackHosts = [...eligibleFallbackRRHosts, ...eligibleFixedHosts];
        const fallbackSlotsStartTime = getStartTimeForHosts(
          startTimeAdjustedForRollingWindowComputation,
          fallbackHosts
        );
        ({
          allUsersAvailability,
          usersWithCredentials,
          currentSeats,
          effectiveLimitsByUserId,
          hasRoundRobinHostLimitOverrides,
        } =
          await this.calculateHostsAndAvailabilities({
            input,
            eventType,
            hosts: fallbackHosts,
            loggerWithEventDetails,
            startTime: fallbackSlotsStartTime,
            endTime,
            bypassBusyCalendarTimes,
            silentCalendarFailures,
            mode,
          }));
        ({ aggregatedAvailability, timeSlots } = generateSlotsForHosts({
          allUsersAvailability,
          effectiveLimitsByUserId,
          hasRoundRobinHostLimitOverrides,
          slotsStartTime: fallbackSlotsStartTime,
          inviteeDateForStandardSlots: startTime,
          includeSingleHostOutOfOffice: false,
        }));
      }
    }

    let availableTimeSlots: typeof timeSlots = [];
    const bookerClientUid = ctx?.req?.cookies?.uid;
    const isRestrictionScheduleFeatureEnabled = await this.checkRestrictionScheduleEnabled(
      eventType.team?.id
    );
    if (eventType.restrictionScheduleId && isRestrictionScheduleFeatureEnabled) {
      const restrictionSchedule = await this.dependencies.scheduleRepo.findScheduleByIdForBuildDateRanges({
        scheduleId: eventType.restrictionScheduleId,
      });
      if (restrictionSchedule) {
        // runtime error preventing misconfiguration when restrictionSchedule timeZone must be used.
        if (!eventType.useBookerTimezone && !restrictionSchedule.timeZone) {
          throw new Error("No timezone is set for the restricted schedule");
        }

        const restrictionTimezone = eventType.useBookerTimezone
          ? input.timeZone
          : (restrictionSchedule.timeZone ?? "UTC");
        const eventLength = input.duration || eventType.length;

        const restrictionAvailability = restrictionSchedule.availability.map((rule) => ({
          days: rule.days,
          startTime: rule.startTime,
          endTime: rule.endTime,
          date: rule.date,
        }));

        // Include travel schedules if restriction schedule is the user's default schedule
        const isDefaultSchedule = restrictionSchedule.user.defaultScheduleId === restrictionSchedule.id;
        const travelSchedules =
          isDefaultSchedule && !eventType.useBookerTimezone
            ? restrictionSchedule.user.travelSchedules.map((schedule) => ({
                startDate: dayjs(schedule.startDate),
                endDate: schedule.endDate ? dayjs(schedule.endDate) : undefined,
                timeZone: schedule.timeZone,
              }))
            : [];

        const { dateRanges: restrictionRanges } = buildDateRanges({
          availability: restrictionAvailability,
          timeZone: restrictionTimezone || "UTC",
          dateFrom: startTime,
          dateTo: endTime,
          travelSchedules,
        });

        availableTimeSlots = timeSlots.filter((slot) => {
          const slotStart = slot.time;
          const slotEnd = slot.time.add(eventLength, "minute");

          return restrictionRanges.some(
            (range) =>
              (slotStart.isAfter(range.start) || slotStart.isSame(range.start)) &&
              (slotEnd.isBefore(range.end) || slotEnd.isSame(range.end))
          );
        });
      } else {
        availableTimeSlots = timeSlots;
      }
    } else {
      availableTimeSlots = timeSlots;
    }

    const reservedSlots = await this._getReservedSlotsAndCleanupExpired({
      bookerClientUid,
      eventTypeId: eventType.id,
      usersWithCredentials,
    });

    const availabilityCheckProps = {
      eventLength: input.duration || eventType.length,
      currentSeats,
    };

    if (reservedSlots?.length > 0) {
      let occupiedSeats: typeof reservedSlots = reservedSlots.filter(
        (item) => item.isSeat && item.eventTypeId === eventType.id
      );
      if (occupiedSeats?.length) {
        const addedToCurrentSeats: string[] = [];
        if (typeof availabilityCheckProps.currentSeats !== "undefined") {
          availabilityCheckProps.currentSeats = availabilityCheckProps.currentSeats.map((item) => {
            const attendees =
              occupiedSeats.filter(
                (seat) => seat.slotUtcStartDate.toISOString() === item.startTime.toISOString()
              )?.length || 0;
            if (attendees) addedToCurrentSeats.push(item.startTime.toISOString());
            return {
              ...item,
              _count: {
                attendees: item._count.attendees + attendees,
              },
            };
          });
          occupiedSeats = occupiedSeats.filter(
            (item) => !addedToCurrentSeats.includes(item.slotUtcStartDate.toISOString())
          );
        }

        availabilityCheckProps.currentSeats = this.applyOccupiedSeatsToCurrentSeats(
          availabilityCheckProps.currentSeats || [],
          occupiedSeats
        );

        currentSeats = availabilityCheckProps.currentSeats;
      }
      const busySlotsFromReservedSlots = reservedSlots.reduce<EventBusyDate[]>((r, c) => {
        if (!c.isSeat) {
          r.push({ start: c.slotUtcStartDate, end: c.slotUtcEndDate });
        }
        return r;
      }, []);

      availableTimeSlots = availableTimeSlots
        .map((slot) => {
          if (
            !checkForConflicts({
              time: slot.time,
              busy: busySlotsFromReservedSlots,
              ...availabilityCheckProps,
            })
          ) {
            return slot;
          }
          return undefined;
        })
        .filter(
          (
            item:
              | {
                  time: dayjs.Dayjs;
                  userIds?: number[] | undefined;
                }
              | undefined
          ): item is {
            time: dayjs.Dayjs;
            userIds?: number[] | undefined;
          } => {
            return !!item;
          }
        );
    }

    // fr-CA uses YYYY-MM-DD
    const formatter = new Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: input.timeZone,
    });

    function _mapSlotsToDate() {
      const currentSeatsMap = new Map();

      if (currentSeats && currentSeats.length > 0) {
        currentSeats.forEach((booking) => {
          const timeKey = booking.startTime.toISOString();
          currentSeatsMap.set(timeKey, {
            attendees: booking._count.attendees,
            uid: booking.uid,
          });
        });
      }

      return availableTimeSlots.reduce(
        (
          r: Record<string, { time: string; attendees?: number; bookingUid?: string }[]>,
          { time, ...passThroughProps }
        ) => {
          // This used to be _time.tz(input.timeZone) but Dayjs tz() is slow.
          // toLocaleDateString slugish, using Intl.DateTimeFormat we get the desired speed results.
          const dateString = formatter.format(time.toDate());
          const timeISO = time.toISOString();

          r[dateString] = r[dateString] || [];
          if (eventType?.onlyShowFirstAvailableSlot && r[dateString].length > 0) {
            return r;
          }

          const existingBooking = currentSeatsMap.get(timeISO);

          r[dateString].push({
            ...passThroughProps,
            time: timeISO,
            ...(existingBooking && {
              attendees: existingBooking.attendees,
              bookingUid: existingBooking.uid,
            }),
          });
          return r;
        },
        Object.create(null)
      );
    }
    const mapSlotsToDate = withReporting(_mapSlotsToDate.bind(this), "mapSlotsToDate");
    const slotsMappedToDate = mapSlotsToDate();

    const withinBoundsSlotsMappedToDate = hasRoundRobinHostLimitOverrides
      ? slotsMappedToDate
      : (() => {
          const availableDates = Object.keys(slotsMappedToDate);
          const allDatesWithBookabilityStatus = this.getAllDatesWithBookabilityStatus(availableDates);
          const eventUtcOffset = getUTCOffsetByTimezone(eventTimeZone) ?? 0;
          const bookerUtcOffset = input.timeZone ? (getUTCOffsetByTimezone(input.timeZone) ?? 0) : 0;
          const periodLimits = calculatePeriodLimits({
            periodType: eventType.periodType,
            periodDays: eventType.periodDays,
            periodCountCalendarDays: eventType.periodCountCalendarDays,
            periodStartDate: eventType.periodStartDate,
            periodEndDate: eventType.periodEndDate,
            allDatesWithBookabilityStatusInBookerTz: allDatesWithBookabilityStatus,
            eventUtcOffset,
            bookerUtcOffset,
          });

          const mapWithinBoundsSlotsToDate = withReporting(() => {
            let foundAFutureLimitViolation = false;
            const nextSlotsMappedToDate = {} as typeof slotsMappedToDate;
            const doesStartFromToday = this.doesRangeStartFromToday(eventType.periodType);

            for (const date of Object.keys(slotsMappedToDate)) {
              const slots = slotsMappedToDate[date] ?? [];

              if (foundAFutureLimitViolation && doesStartFromToday) {
                break;
              }

              const filteredSlots = slots.filter((slot) => {
                const isFutureLimitViolationForTheSlot = isTimeViolatingFutureLimit({
                  time: slot.time,
                  periodLimits,
                });

                let isOutOfBounds = false;
                try {
                  isOutOfBounds = isTimeOutOfBounds({
                    time: slot.time,
                    minimumBookingNotice: eventType.minimumBookingNotice,
                  });
                } catch (error) {
                  if (error instanceof BookingDateInPastError) {
                    throw new TRPCError({
                      code: "BAD_REQUEST",
                      message: error.message,
                    });
                  }
                  throw error;
                }

                if (isFutureLimitViolationForTheSlot) {
                  foundAFutureLimitViolation = true;
                }

                return !isFutureLimitViolationForTheSlot && !isOutOfBounds;
              });

              if (filteredSlots.length) {
                nextSlotsMappedToDate[date] = filteredSlots;
              }
            }

            return nextSlotsMappedToDate;
          }, "mapWithinBoundsSlotsToDate");

          return mapWithinBoundsSlotsToDate();
        })();

    const filteredSlotsMappedToDate = this.filterSlotsByRequestedDateRange({
      slotsMappedToDate: withinBoundsSlotsMappedToDate,
      startTime: input.startTime,
      endTime: input.endTime,
      timeZone: input.timeZone,
    });

    // We only want to run this on single targeted events and not dynamic
    if (!Object.keys(filteredSlotsMappedToDate).length && input.usernameList?.length === 1) {
      try {
        await this.dependencies.noSlotsNotificationService.handleNotificationWhenNoSlots({
          eventDetails: {
            username: input.usernameList?.[0],
            startTime: startTime,
            endTime: endTime,
            eventSlug: eventType.slug,
          },
          orgDetails,
          teamId: eventType.team?.id,
        });
      } catch (e) {
        loggerWithEventDetails.error(
          `Something has gone wrong. Upstash could be down and we have caught the error to not block availability:
 ${e}`
        );
      }
    }

    const troubleshooterData = enableTroubleshooter
      ? {
          troubleshooter: {
            routedTeamMemberIds: routedTeamMemberIds,
            // One that Salesforce asked for
            askedContactOwner: contactOwnerEmailFromInput,
            // One that we used as per Routing skipContactOwner flag
            consideredContactOwner: contactOwnerEmail,
            // All hosts that have been checked for availability. If no routedTeamMemberIds are provided, this will be same as hosts.
            routedHosts: usersWithCredentials.map((user) => {
              return {
                userId: user.id,
              };
            }),
            hostsAfterSegmentMatching: allHosts.map((host) => ({
              userId: host.user.id,
            })),
          },
        }
      : null;

    return {
      slots: filteredSlotsMappedToDate,
      ...troubleshooterData,
    };
  }
}
