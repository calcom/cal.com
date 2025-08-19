import type { User } from "@prisma/client";

import type { FormResponse, Fields } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
import dayjs from "@calcom/dayjs";
import { getBusyCalendarTimes } from "@calcom/lib/CalendarManager";
import logger from "@calcom/lib/logger";
import { getAttributesQueryValue } from "@calcom/lib/raqb/getAttributesQueryValue";
import { raqbQueryValueSchema } from "@calcom/lib/raqb/zod";
import { safeStringify } from "@calcom/lib/safeStringify";
import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { HostRepository } from "@calcom/lib/server/repository/host";
import { PrismaOOORepository } from "@calcom/lib/server/repository/ooo";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { Booking } from "@calcom/prisma/client";
import type { AttributeType } from "@calcom/prisma/enums";
import { RRTimestampBasis, RRResetInterval } from "@calcom/prisma/enums";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["LuckyUserService"] });

type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

type PartialUser = Pick<User, "id" | "email">;

export type RoutingFormResponse = {
  response: any;
  chosenRouteId: string | null;
  form: {
    fields: any;
    routes: any;
  };
};

type AttributeWithWeights = {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  options: {
    id: string;
    value: string;
    slug: string;
    assignedUsers: {
      member: {
        userId: number;
      };
      weight: number;
    }[];
  }[];
};

type VirtualQueuesDataType = {
  chosenRouteId: string;
  fieldOptionData: {
    fieldId: string;
    selectedOptionIds: string | number | string[];
  };
};

interface GetLuckyUserParams<T extends PartialUser> {
  availableUsers: [T, ...T[]];
  eventType: {
    id: number;
    isRRWeightsEnabled: boolean;
    team: {
      parentId?: number | null;
      rrResetInterval: RRResetInterval | null;
      rrTimestampBasis: RRTimestampBasis;
    } | null;
    includeNoShowInRRCalculation: boolean;
  };
  allRRHosts: {
    user: {
      id: number;
      email: string;
      credentials: CredentialForCalendarService[];
      userLevelSelectedCalendars: any[];
    };
    createdAt: Date;
    weight?: number | null;
  }[];
  routingFormResponse: RoutingFormResponse | null;
  meetingStartTime?: Date;
}

interface FetchedData {
  bookingsOfAvailableUsersOfInterval: PartialBooking[];
  bookingsOfNotAvailableUsersOfInterval: PartialBooking[];
  allRRHostsBookingsOfInterval: PartialBooking[];
  allRRHostsCreatedInInterval: any[];
  organizersWithLastCreated: any[];
  attributeWeights: { userId: number; weight: number }[] | null;
  virtualQueuesData: VirtualQueuesDataType | null;
  oooData: { userId: number; oooEntries: { start: Date; end: Date }[] }[];
}

type AvailableUserBase = PartialUser & {
  priority?: number | null;
  weight?: number | null;
};

const startOfMonth = (date: Date) => dayjs(date).startOf("month").toDate();
const startOfDay = (date: Date) => dayjs(date).startOf("day").toDate();
const endOfDay = (date: Date) => dayjs(date).endOf("day").toDate();
const endOfMonth = (date: Date) => dayjs(date).endOf("month").toDate();

function getIntervalEndDate({
  interval,
  rrTimestampBasis,
  meetingStartTime,
}: {
  interval: RRResetInterval;
  rrTimestampBasis: RRTimestampBasis;
  meetingStartTime?: Date;
}) {
  const now = meetingStartTime || new Date();
  if (interval === RRResetInterval.MONTH) {
    return rrTimestampBasis === RRTimestampBasis.CREATED_AT ? endOfMonth(now) : endOfDay(now);
  }
  return endOfDay(now);
}

function getIntervalStartDate({
  interval,
  rrTimestampBasis,
  meetingStartTime,
}: {
  interval: RRResetInterval;
  rrTimestampBasis: RRTimestampBasis;
  meetingStartTime?: Date;
}) {
  const now = meetingStartTime || new Date();
  if (interval === RRResetInterval.MONTH) {
    return rrTimestampBasis === RRTimestampBasis.CREATED_AT ? startOfMonth(now) : startOfDay(now);
  }
  return startOfDay(now);
}

export class LuckyUserService {
  constructor(
    private bookingRepository: BookingRepository,
    private hostRepository: HostRepository,
    private oooRepository: PrismaOOORepository,
    private userRepository: UserRepository,
    private attributeRepository: PrismaAttributeRepository
  ) {}

  async getLuckyUser<
    T extends PartialUser & {
      priority?: number | null;
      weight?: number | null;
    }
  >(getLuckyUserParams: GetLuckyUserParams<T>) {
    const fetchedData = await this.fetchAllDataNeededForCalculations(getLuckyUserParams);
    const { luckyUser } = this.getLuckyUser_requiresDataToBePreFetched({
      ...getLuckyUserParams,
      ...fetchedData,
    });
    return luckyUser;
  }

  getLuckyUser_requiresDataToBePreFetched<
    T extends PartialUser & {
      priority?: number | null;
      weight?: number | null;
    }
  >(
    params: GetLuckyUserParams<T> & FetchedData
  ): {
    luckyUser: T;
    usersAndTheirBookingShortfalls: {
      id: number;
      bookingShortfall: number;
      calibration: number;
      weight: number;
    }[];
  } {
    const {
      eventType,
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated,
      oooData,
    } = params;

    const usersAndTheirBookingShortfalls = this.filterUsersBasedOnWeights({
      ...params,
      eventType,
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated,
      oooData,
    });

    const { remainingUsersAfterWeightFilter } = usersAndTheirBookingShortfalls;

    if (remainingUsersAfterWeightFilter.length === 0) {
      throw new Error("No users available after weight filtering");
    }

    const luckyUser = remainingUsersAfterWeightFilter[0];

    return {
      luckyUser,
      usersAndTheirBookingShortfalls: usersAndTheirBookingShortfalls.usersAndTheirBookingShortfalls,
    };
  }

  async getOrderedListOfLuckyUsers<AvailableUser extends AvailableUserBase>(
    getLuckyUserParams: GetLuckyUserParams<AvailableUser>
  ) {
    const { availableUsers, eventType } = getLuckyUserParams;

    const fetchedData = await this.fetchAllDataNeededForCalculations(getLuckyUserParams);

    const {
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated,
      attributeWeights,
      virtualQueuesData,
      oooData,
    } = fetchedData;

    log.info(
      "getOrderedListOfLuckyUsers",
      safeStringify({
        availableUsers: availableUsers.map((user) => {
          return { id: user.id, email: user.email, priority: user.priority, weight: user.weight };
        }),
        bookingsOfAvailableUsersOfInterval,
        bookingsOfNotAvailableUsersOfInterval,
        allRRHostsBookingsOfInterval,
        allRRHostsCreatedInInterval,
        organizersWithLastCreated,
      })
    );

    let remainingAvailableUsers = [...availableUsers];
    let bookingsOfRemainingAvailableUsersOfInterval = [...bookingsOfAvailableUsersOfInterval];
    const orderedUsersSet = new Set<AvailableUser>();
    const perUserBookingsCount: Record<number, number> = {};

    const startTime = performance.now();
    let usersAndTheirBookingShortfalls: {
      id: number;
      bookingShortfall: number;
      calibration: number;
      weight: number;
    }[] = [];

    while (remainingAvailableUsers.length > 0) {
      const { luckyUser, usersAndTheirBookingShortfalls: _usersAndTheirBookingShortfalls } =
        this.getLuckyUser_requiresDataToBePreFetched({
          ...getLuckyUserParams,
          eventType,
          availableUsers: remainingAvailableUsers as [AvailableUser, ...AvailableUser[]],
          bookingsOfAvailableUsersOfInterval: bookingsOfRemainingAvailableUsersOfInterval,
          bookingsOfNotAvailableUsersOfInterval,
          allRRHostsBookingsOfInterval,
          allRRHostsCreatedInInterval,
          organizersWithLastCreated,
          attributeWeights,
          virtualQueuesData,
          oooData,
        });

      if (!usersAndTheirBookingShortfalls.length) {
        usersAndTheirBookingShortfalls = _usersAndTheirBookingShortfalls;
      }

      if (orderedUsersSet.has(luckyUser)) {
        throw new Error(
          `Error building ordered list of lucky users. The lucky user ${luckyUser.email} is already in the set.`
        );
      }

      orderedUsersSet.add(luckyUser);
      perUserBookingsCount[luckyUser.id] = bookingsOfAvailableUsersOfInterval.filter(
        (booking) => booking.userId === luckyUser.id
      ).length;
      remainingAvailableUsers = remainingAvailableUsers.filter((user) => user.id !== luckyUser.id);
      bookingsOfRemainingAvailableUsersOfInterval = bookingsOfRemainingAvailableUsersOfInterval.filter(
        (booking) => remainingAvailableUsers.map((user) => user.id).includes(booking.userId ?? 0)
      );
    }

    const endTime = performance.now();
    log.info(`getOrderedListOfLuckyUsers took ${endTime - startTime}ms`);

    const bookingShortfalls: Record<number, number> = {};
    const calibrations: Record<number, number> = {};
    const weights: Record<number, number> = {};

    usersAndTheirBookingShortfalls.forEach((user) => {
      bookingShortfalls[user.id] = parseFloat(user.bookingShortfall.toFixed(2));
      calibrations[user.id] = parseFloat(user.calibration.toFixed(2));
      weights[user.id] = user.weight;
    });

    return {
      users: Array.from(orderedUsersSet),
      isUsingAttributeWeights: !!attributeWeights && !!virtualQueuesData,
      perUserData: {
        bookingsCount: perUserBookingsCount,
        bookingShortfalls: eventType.isRRWeightsEnabled ? bookingShortfalls : null,
        calibrations: eventType.isRRWeightsEnabled ? calibrations : null,
        weights: eventType.isRRWeightsEnabled ? weights : null,
      },
    };
  }

  async prepareQueuesAndAttributesData<T extends PartialUser>({
    eventType,
    routingFormResponse,
    allRRHosts,
  }: Omit<GetLuckyUserParams<T>, "availableUsers">) {
    let attributeWeights;
    let virtualQueuesData;
    const organizationId = eventType.team?.parentId;
    log.debug("prepareQueuesAndAttributesData", safeStringify({ routingFormResponse, organizationId }));
    if (routingFormResponse && organizationId) {
      const routingForm = routingFormResponse?.form;
      const routes = zodRoutes.parse(routingForm.routes);
      const chosenRoute = routes?.find((route) => route.id === routingFormResponse.chosenRouteId);

      if (chosenRoute && "attributeIdForWeights" in chosenRoute) {
        const attributeIdForWeights = chosenRoute.attributeIdForWeights;

        const attributeWithEnabledWeights = await this.attributeRepository.findUniqueWithWeights({
          teamId: organizationId,
          attributeId: attributeIdForWeights,
          isWeightsEnabled: true,
        });

        if (attributeWithEnabledWeights) {
          const queueAndAtributeWeightData = await this.getQueueAndAttributeWeightData(
            allRRHosts,
            routingFormResponse,
            attributeWithEnabledWeights
          );
          if (
            queueAndAtributeWeightData?.averageWeightsHosts &&
            queueAndAtributeWeightData?.virtualQueuesData
          ) {
            attributeWeights = queueAndAtributeWeightData?.averageWeightsHosts;
            virtualQueuesData = queueAndAtributeWeightData?.virtualQueuesData;
          }
        }
      }
    }
    return { attributeWeights, virtualQueuesData };
  }

  private async fetchAllDataNeededForCalculations<
    T extends PartialUser & {
      priority?: number | null;
      weight?: number | null;
    }
  >(getLuckyUserParams: GetLuckyUserParams<T>): Promise<FetchedData> {
    const startTime = performance.now();

    const { availableUsers, allRRHosts, eventType, meetingStartTime } = getLuckyUserParams;
    const notAvailableHosts = (function getNotAvailableHosts() {
      const availableUserIds = new Set(availableUsers.map((user) => user.id));
      return allRRHosts.reduce(
        (
          acc: {
            id: number;
            email: string;
          }[],
          host
        ) => {
          if (!availableUserIds.has(host.user.id)) {
            acc.push({
              id: host.user.id,
              email: host.user.email,
            });
          }
          return acc;
        },
        []
      );
    })();

    const { attributeWeights, virtualQueuesData } = await this.prepareQueuesAndAttributesData(
      getLuckyUserParams
    );

    const interval =
      eventType.isRRWeightsEnabled && getLuckyUserParams.eventType.team?.rrResetInterval
        ? getLuckyUserParams.eventType.team?.rrResetInterval
        : RRResetInterval.MONTH;

    const rrTimestampBasis =
      eventType.isRRWeightsEnabled && getLuckyUserParams.eventType.team?.rrTimestampBasis
        ? getLuckyUserParams.eventType.team.rrTimestampBasis
        : RRTimestampBasis.CREATED_AT;

    const intervalStartDate = getIntervalStartDate({ interval, rrTimestampBasis, meetingStartTime });
    const intervalEndDate = getIntervalEndDate({ interval, rrTimestampBasis, meetingStartTime });

    const [
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated,
    ] = await Promise.all([
      Promise.resolve([]),
      this.getBookingsOfInterval({
        eventTypeId: eventType.id,
        users: availableUsers.map((user) => {
          return { id: user.id, email: user.email };
        }),
        virtualQueuesData: virtualQueuesData ?? null,
        interval,
        includeNoShowInRRCalculation: eventType.includeNoShowInRRCalculation,
        rrTimestampBasis,
        meetingStartTime,
      }),

      this.getBookingsOfInterval({
        eventTypeId: eventType.id,
        users: notAvailableHosts,
        virtualQueuesData: virtualQueuesData ?? null,
        interval,
        includeNoShowInRRCalculation: eventType.includeNoShowInRRCalculation,
        rrTimestampBasis,
        meetingStartTime,
      }),

      this.getBookingsOfInterval({
        eventTypeId: eventType.id,
        users: allRRHosts.map((host) => {
          return { id: host.user.id, email: host.user.email };
        }),
        virtualQueuesData: virtualQueuesData ?? null,
        interval,
        includeNoShowInRRCalculation: eventType.includeNoShowInRRCalculation,
        rrTimestampBasis,
        meetingStartTime,
      }),

      this.hostRepository.findHostsCreatedInInterval({
        eventTypeId: eventType.id,
        userIds: allRRHosts.map((host) => host.user.id),
        startDate: intervalStartDate,
        endDate: intervalEndDate,
      }),

      this.userRepository.findUsersWithLastBooking({
        userIds: availableUsers.map((user) => user.id),
        eventTypeId: eventType.id,
      }),
    ]);

    const oooEntries = await this.oooRepository.findOOOEntriesInInterval({
      userIds: allRRHosts.map((host) => host.user.id),
      startDate: intervalStartDate,
      endDate: intervalEndDate,
    });

    const oooEntriesGroupedByUserId = new Map<number, { start: Date; end: Date }[]>();

    oooEntries.forEach((entry) => {
      if (!oooEntriesGroupedByUserId.has(entry.userId)) {
        oooEntriesGroupedByUserId.set(entry.userId, []);
      }
      oooEntriesGroupedByUserId.get(entry.userId)!.push({ start: entry.start, end: entry.end });
    });

    const oooData: { userId: number; oooEntries: { start: Date; end: Date }[] }[] = [];

    allRRHosts.forEach((host) => {
      const userOOOEntries = oooEntriesGroupedByUserId.get(host.user.id) || [];
      oooData.push({
        userId: host.user.id,
        oooEntries: userOOOEntries,
      });
    });

    const endTime = performance.now();
    log.info(`fetchAllDataNeededForCalculations took ${endTime - startTime}ms`);

    return {
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated,
      attributeWeights,
      virtualQueuesData,
      oooData,
    };
  }

  private async getCalendarBusyTimesOfInterval(
    users: { id: number; credentials: CredentialForCalendarService[]; userLevelSelectedCalendars: any[] }[],
    interval: RRResetInterval,
    rrTimestampBasis: RRTimestampBasis,
    meetingStartTime?: Date
  ) {
    const startDate = getIntervalStartDate({ interval, rrTimestampBasis, meetingStartTime });
    const endDate = getIntervalEndDate({ interval, rrTimestampBasis, meetingStartTime });

    const usersBusyTimesQuery = users.map(async (user) => {
      const busyTimes = await getBusyCalendarTimes(
        user.credentials,
        startDate,
        endDate,
        user.userLevelSelectedCalendars,
        { includeTimeZone: true }
      );
      return {
        userId: user.id,
        busyTimes: busyTimes as EventBusyDate[],
      };
    });

    return Promise.all(usersBusyTimesQuery);
  }

  private async getBookingsOfInterval({
    eventTypeId,
    users,
    virtualQueuesData,
    interval,
    includeNoShowInRRCalculation,
    rrTimestampBasis,
    meetingStartTime,
  }: {
    eventTypeId: number;
    users: { id: number; email: string }[];
    virtualQueuesData: VirtualQueuesDataType | null;
    interval: RRResetInterval;
    includeNoShowInRRCalculation: boolean;
    rrTimestampBasis: RRTimestampBasis;
    meetingStartTime?: Date;
  }) {
    const startDate = getIntervalStartDate({ interval, rrTimestampBasis, meetingStartTime });
    const endDate = getIntervalEndDate({ interval, rrTimestampBasis, meetingStartTime });

    return this.bookingRepository.getAllBookingsForRoundRobin({
      eventTypeId,
      users,
      startDate,
      endDate,
      virtualQueuesData,
      includeNoShowInRRCalculation,
    });
  }

  private filterUsersBasedOnWeights<
    T extends PartialUser & {
      priority?: number | null;
      weight?: number | null;
    }
  >(params: GetLuckyUserParams<T> & FetchedData) {
    const {
      availableUsers,
      eventType,
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated,
      attributeWeights,
      oooData,
    } = params;

    const allHostsWithCalibration = this.getHostsWithCalibration({
      availableUsers,
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated,
      oooData,
    });

    if (!eventType.isRRWeightsEnabled) {
      const usersWithHighestPriority = this.getUsersWithHighestPriority(allHostsWithCalibration);
      return {
        remainingUsersAfterWeightFilter: usersWithHighestPriority,
        usersAndTheirBookingShortfalls: [],
      };
    }

    const totalWeight = attributeWeights
      ? attributeWeights.reduce((acc, user) => acc + user.weight, 0)
      : allHostsWithCalibration.reduce((acc, user) => acc + (user.weight ?? 100), 0);

    const totalCalibration = allHostsWithCalibration.reduce((acc, user) => acc + user.calibration, 0);

    const usersWithBookingShortfalls = allHostsWithCalibration.map((user) => {
      const userBookings = bookingsOfAvailableUsersOfInterval.filter((booking) => booking.userId === user.id);
      const userWeight = attributeWeights?.find((w) => w.userId === user.id)?.weight ?? user.weight ?? 100;
      const expectedBookings = totalCalibration * (userWeight / totalWeight);
      const bookingShortfall = expectedBookings - userBookings.length;

      return {
        id: user.id,
        bookingShortfall,
        calibration: user.calibration,
        weight: userWeight,
      };
    });

    const maxShortfall = Math.max(...usersWithBookingShortfalls.map((user) => user.bookingShortfall));
    const usersWithMaxShortfall = usersWithBookingShortfalls.filter(
      (user) => user.bookingShortfall === maxShortfall
    );

    const userIdsWithMaxShortfallAndWeight = usersWithMaxShortfall.map((user) => user.id);

    const remainingUsersAfterWeightFilter = allHostsWithCalibration.filter((user) =>
      userIdsWithMaxShortfallAndWeight.includes(user.id)
    );

    return {
      remainingUsersAfterWeightFilter,
      usersAndTheirBookingShortfalls: usersWithBookingShortfalls,
    };
  }

  private getHostsWithCalibration<T extends PartialUser>({ availableUsers }: { availableUsers: T[] }) {
    function calculateNewHostCalibration() {
      return 1; // Default calibration value
    }

    const newHostsWithCalibration = availableUsers.map((user) => {
      const calibration = calculateNewHostCalibration();

      return {
        ...user,
        calibration,
      };
    });

    return newHostsWithCalibration;
  }

  private getUsersWithHighestPriority<T extends PartialUser & { priority?: number | null }>(users: T[]) {
    const highestPriority = Math.max(...users.map((user) => user.priority ?? 2));
    const usersWithHighestPriority = users.filter((user) => (user.priority ?? 2) === highestPriority);
    return usersWithHighestPriority;
  }

  private async getQueueAndAttributeWeightData<T extends PartialUser & { priority?: number | null }>(
    allRRHosts: GetLuckyUserParams<T>["allRRHosts"],
    routingFormResponse: RoutingFormResponse,
    attributeWithWeights: AttributeWithWeights
  ) {
    let averageWeightsHosts: { userId: number; weight: number }[] = [];

    const chosenRouteId = routingFormResponse?.chosenRouteId ?? undefined;

    if (!chosenRouteId) return;

    let fieldOptionData: { fieldId: string; selectedOptionIds: string | number | string[] } | undefined;

    const routingForm = routingFormResponse?.form;

    if (routingForm && routingFormResponse) {
      const response = routingFormResponse.response as FormResponse;

      const routes = zodRoutes.parse(routingForm.routes);
      const chosenRoute = routes?.find((route) => route.id === routingFormResponse.chosenRouteId);

      if (chosenRoute && "attributesQueryValue" in chosenRoute) {
        const parsedAttributesQueryValue = raqbQueryValueSchema.parse(chosenRoute.attributesQueryValue);

        const attributesQueryValueWithLabel = getAttributesQueryValue({
          attributesQueryValue: chosenRoute.attributesQueryValue,
          attributes: [attributeWithWeights],
          dynamicFieldValueOperands: {
            fields: (routingFormResponse.form.fields as Fields) || [],
            response,
          },
        });

        const parsedAttributesQueryValueWithLabel = raqbQueryValueSchema.parse(attributesQueryValueWithLabel);

        if (parsedAttributesQueryValueWithLabel && parsedAttributesQueryValueWithLabel.children1) {
          averageWeightsHosts = this.getAverageAttributeWeights(
            allRRHosts,
            parsedAttributesQueryValueWithLabel.children1,
            attributeWithWeights
          );
        }

        if (parsedAttributesQueryValue && parsedAttributesQueryValue.children1) {
          fieldOptionData = this.getAttributesForVirtualQueues(
            response,
            parsedAttributesQueryValue.children1,
            attributeWithWeights
          );
        }
      }
    }

    if (fieldOptionData) {
      return { averageWeightsHosts, virtualQueuesData: { chosenRouteId, fieldOptionData } };
    }

    return;
  }

  private getAverageAttributeWeights<
    T extends PartialUser & {
      priority?: number | null;
      weight?: number | null;
    }
  >(
    allRRHosts: GetLuckyUserParams<T>["allRRHosts"],
    attributesQueryValueChild: Record<
      string,
      {
        type?: string | undefined;
        properties?:
          | {
              field?: any;
              operator?: any;
              value?: any;
              valueSrc?: any;
            }
          | undefined;
      }
    >,
    attributeWithWeights: AttributeWithWeights
  ) {
    let averageWeightsHosts: { userId: number; weight: number }[] = [];

    const fieldValueArray = Object.values(attributesQueryValueChild).map((child) => ({
      field: child.properties?.field,
      value: child.properties?.value,
    }));

    fieldValueArray.map((obj) => {
      const attributeId = obj.field;
      const allRRHostsWeights = new Map<number, number[]>();

      if (attributeId === attributeWithWeights.id) {
        obj.value.forEach((arrayobj: string[]) => {
          arrayobj.forEach((attributeOption: string) => {
            const attributeOptionWithUsers = attributeWithWeights.options.find(
              (option) => option.value.toLowerCase() === attributeOption.toLowerCase()
            );

            allRRHosts.forEach((rrHost) => {
              const assignedUser = attributeOptionWithUsers?.assignedUsers.find(
                (assignedUser) => rrHost.user.id === assignedUser.member.userId
              );

              if (allRRHostsWeights.has(rrHost.user.id)) {
                allRRHostsWeights.get(rrHost.user.id)?.push(assignedUser?.weight ?? rrHost.weight ?? 100);
              } else {
                allRRHostsWeights.set(rrHost.user.id, [assignedUser?.weight ?? rrHost.weight ?? 100]);
              }
            });
          });
        });
        averageWeightsHosts = Array.from(allRRHostsWeights.entries()).map(([userId, weights]) => {
          const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
          const averageWeight = totalWeight / weights.length;

          return {
            userId,
            weight: averageWeight,
          };
        });
      }
    });

    return averageWeightsHosts;
  }

  private getAttributesForVirtualQueues(
    response: Record<string, Pick<FormResponse[keyof FormResponse], "value">>,
    attributesQueryValueChild: Record<
      string,
      {
        type?: string | undefined;
        properties?:
          | {
              field?: any;
              operator?: any;
              value?: any;
              valueSrc?: any;
            }
          | undefined;
      }
    >,
    attributeWithWeights: { id: string }
  ) {
    let selectionOptions: Pick<VirtualQueuesDataType, "fieldOptionData">["fieldOptionData"] | undefined;

    const fieldValueArray = Object.values(attributesQueryValueChild).map((child) => ({
      field: child.properties?.field,
      value: child.properties?.value,
    }));

    fieldValueArray.some((obj) => {
      const attributeId = obj.field;

      if (attributeId === attributeWithWeights.id) {
        obj.value.some((arrayobj: string[]) => {
          arrayobj.some((attributeOptionId: string) => {
            const content = attributeOptionId.slice(1, -1);

            const routingFormFieldId = content.includes("field:") ? content.split("field:")[1] : null;

            if (routingFormFieldId) {
              const fieldResponse = response[routingFormFieldId];
              selectionOptions = { fieldId: routingFormFieldId, selectedOptionIds: fieldResponse.value };
              return true;
            }
          });
        });
      }
    });
    return selectionOptions;
  }
}
