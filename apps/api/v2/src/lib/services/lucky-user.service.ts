import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { Injectable } from "@nestjs/common";

import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";
import { HostRepository } from "@calcom/lib/server/repository/host";
import { PrismaOOORepository as PrismaOOORepositoryLib } from "@calcom/lib/server/repository/ooo";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { Prisma, User } from "@calcom/prisma/client";
import type { Booking } from "@calcom/prisma/client";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { RRTimestampBasis, RRResetInterval } from "@calcom/prisma/enums";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

type PartialUser = Pick<User, "id" | "email">;

export type RoutingFormResponse = {
  response: Prisma.JsonValue;
  chosenRouteId: string | null;
  form: {
    fields: Prisma.JsonValue;
    routes: Prisma.JsonValue;
  };
};

type AttributeWithWeights = {
  name: string;
  slug: string;
  type: AttributeType;
  id: string;
  options: {
    id: string;
    value: string;
    slug: string;
    assignedUsers: {
      weight: number | null;
      member: {
        userId: number;
      };
    }[];
  }[];
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
      userLevelSelectedCalendars: SelectedCalendar[];
    };
    createdAt: Date;
    weight?: number | null;
  }[];
  routingFormResponse: RoutingFormResponse | null;
  meetingStartTime?: Date;
}

@Injectable()
export class LuckyUserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly bookingRepository: PrismaBookingRepository,
    private readonly oooRepository: PrismaOOORepository
  ) {}

  async getLuckyUser<T extends PartialUser & { priority?: number | null; weight?: number | null }>(
    getLuckyUserParams: GetLuckyUserParams<T>
  ) {
    const fetchedData = await this.fetchAllDataNeededForCalculations(getLuckyUserParams);
    return this.getLuckyUser_requiresDataToBePreFetched({
      ...getLuckyUserParams,
      ...fetchedData,
    });
  }

  async getLuckyUser_requiresDataToBePreFetched<
    T extends PartialUser & { priority?: number | null; weight?: number | null }
  >(params: GetLuckyUserParams<T> & FetchedData) {
    const { availableUsers, eventType } = params;
    const { bookingsOfAvailableUsersOfInterval, allRRHostsBookingsOfInterval, allRRHostsCreatedInInterval } =
      params;

    if (!availableUsers.length) {
      return null;
    }

    if (availableUsers.length === 1) {
      return availableUsers[0];
    }

    const usersAndTheirBookingShortfalls = this.getUsersAndTheirBookingShortfalls({
      availableUsers,
      bookingsOfAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
    });

    const { remainingUsersAfterWeightFilter } = this.filterUsersBasedOnWeights({
      availableUsers,
      eventType,
      usersAndTheirBookingShortfalls,
      allRRHostsCreatedInInterval,
    });

    if (remainingUsersAfterWeightFilter.length === 0) {
      return null;
    }

    if (remainingUsersAfterWeightFilter.length === 1) {
      return remainingUsersAfterWeightFilter[0];
    }

    return this.leastRecentlyBookedUser({
      availableUsers: remainingUsersAfterWeightFilter,
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval: [],
    });
  }

  async getOrderedListOfLuckyUsers<AvailableUser extends PartialUser>(
    getLuckyUserParams: GetLuckyUserParams<AvailableUser>
  ) {
    const fetchedData = await this.fetchAllDataNeededForCalculations(getLuckyUserParams);
    return this.getOrderedListOfLuckyUsers_requiresDataToBePreFetched({
      ...getLuckyUserParams,
      ...fetchedData,
    });
  }

  async getOrderedListOfLuckyUsers_requiresDataToBePreFetched<AvailableUser extends PartialUser>(
    params: GetLuckyUserParams<AvailableUser> & FetchedData
  ) {
    const { availableUsers } = params;
    const { bookingsOfAvailableUsersOfInterval, allRRHostsBookingsOfInterval, allRRHostsCreatedInInterval } =
      params;

    if (!availableUsers.length) {
      return [];
    }

    if (availableUsers.length === 1) {
      return availableUsers;
    }

    const usersAndTheirBookingShortfalls = this.getUsersAndTheirBookingShortfalls({
      availableUsers,
      bookingsOfAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
    });

    const { luckyUser } = this.filterUsersBasedOnWeights({
      availableUsers,
      eventType: params.eventType,
      usersAndTheirBookingShortfalls,
      allRRHostsCreatedInInterval,
    });

    if (!luckyUser) {
      return [];
    }

    const bookingsOfRemainingAvailableUsersOfInterval = bookingsOfAvailableUsersOfInterval.filter(
      (booking) => booking.userId !== luckyUser.id
    );

    const remainingUsers = availableUsers.filter((user) => user.id !== luckyUser.id);

    if (remainingUsers.length === 0) {
      return [luckyUser];
    }

    const orderedRemainingUsers = await this.getOrderedListOfLuckyUsers_requiresDataToBePreFetched({
      ...params,
      availableUsers: remainingUsers as [AvailableUser, ...AvailableUser[]],
      bookingsOfAvailableUsersOfInterval: bookingsOfRemainingAvailableUsersOfInterval,
    });

    return [luckyUser, ...orderedRemainingUsers];
  }

  async prepareQueuesAndAttributesData<T extends PartialUser>(
    params: Omit<GetLuckyUserParams<T>, "availableUsers">
  ) {
    const { eventType, routingFormResponse } = params;

    if (!routingFormResponse || !eventType.team?.parentId) {
      return {
        queuesAndAttributesData: {
          attributeWeights: null,
          virtualQueuesData: null,
        },
      };
    }

    const attributeWithEnabledWeights = await PrismaAttributeRepository.findUniqueWithWeights({
      teamId: eventType.team.parentId,
      routingFormResponse,
    });

    const queueAndAtributeWeightData = this.getQueueAndAttributeWeightData({
      routingFormResponse,
      attributeWithEnabledWeights,
    });

    return {
      queuesAndAttributesData: queueAndAtributeWeightData,
    };
  }

  private async fetchAllDataNeededForCalculations<
    T extends PartialUser & { priority?: number | null; weight?: number | null }
  >(getLuckyUserParams: GetLuckyUserParams<T>) {
    const { availableUsers, eventType, allRRHosts, meetingStartTime } = getLuckyUserParams;

    if (!availableUsers.length) {
      return {
        bookingsOfAvailableUsersOfInterval: [],
        bookingsOfNotAvailableUsersOfInterval: [],
        allRRHostsBookingsOfInterval: [],
        allRRHostsCreatedInInterval: [],
        organizersWithLastCreated: [],
        oooData: [],
      };
    }

    const interval = this.getInterval({
      eventType,
      meetingStartTime: meetingStartTime || new Date(),
    });

    const rrTimestampBasis = eventType.team?.rrTimestampBasis || RRTimestampBasis.CREATED_AT;

    const [bookingsOfAvailableUsersOfInterval, allRRHostsBookingsOfInterval, allRRHostsCreatedInInterval] =
      await Promise.all([
        this.getBookingsOfInterval({
          userIds: availableUsers.map((user) => user.id),
          eventTypeId: eventType.id,
          interval,
          rrTimestampBasis,
        }),
        this.getBookingsOfInterval({
          userIds: allRRHosts.map((host) => host.user.id),
          eventTypeId: eventType.id,
          interval,
          rrTimestampBasis,
        }),
        HostRepository.findHostsCreatedInInterval({
          eventTypeId: eventType.id,
          userIds: allRRHosts.map((host) => host.user.id),
        }),
      ]);

    const oooEntries = await PrismaOOORepositoryLib.findOOOEntriesInInterval({
      userIds: availableUsers.map((user) => user.id),
    });

    return {
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval: [],
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated: [],
      oooData: oooEntries,
    };
  }

  private getInterval({
    eventType,
    meetingStartTime,
  }: {
    eventType: GetLuckyUserParams<any>["eventType"];
    meetingStartTime: Date;
  }) {
    const rrResetInterval = eventType.team?.rrResetInterval;

    if (rrResetInterval === RRResetInterval.MONTHLY) {
      return {
        start: this.startOfMonth(meetingStartTime),
        end: this.endOfMonth(meetingStartTime),
      };
    }

    return {
      start: this.startOfDay(meetingStartTime),
      end: this.endOfDay(meetingStartTime),
    };
  }

  private startOfMonth = (date: Date = new Date()) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

  private startOfDay = (date: Date = new Date()) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  private endOfDay = (date: Date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

  private endOfMonth = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  };

  private async getBookingsOfInterval({
    userIds,
    eventTypeId,
    interval,
    rrTimestampBasis,
  }: {
    userIds: number[];
    eventTypeId: number;
    interval: { start: Date; end: Date };
    rrTimestampBasis: RRTimestampBasis;
  }) {
    const timestampField = rrTimestampBasis === RRTimestampBasis.CREATED_AT ? "createdAt" : "startTime";

    return this.bookingRepository.findManyByUserIdsAndEventTypeId({
      userIds,
      eventTypeId,
      startTime: interval.start,
      endTime: interval.end,
      timestampField,
    });
  }

  private leastRecentlyBookedUser<T extends PartialUser>({
    availableUsers,
    bookingsOfAvailableUsersOfInterval,
    bookingsOfNotAvailableUsersOfInterval,
  }: {
    availableUsers: T[];
    bookingsOfAvailableUsersOfInterval: PartialBooking[];
    bookingsOfNotAvailableUsersOfInterval: PartialBooking[];
  }) {
    const organizerIdAndAtCreatedPair = bookingsOfAvailableUsersOfInterval.map((booking) => ({
      userId: booking.userId,
      createdAt: booking.createdAt,
    }));

    const attendeeUserIdAndAtCreatedPair = bookingsOfAvailableUsersOfInterval
      .filter((booking) => booking.attendees.length > 0)
      .flatMap((booking) =>
        booking.attendees.map((attendee) => ({
          userId: availableUsers.find((user) => user.email === attendee.email)?.id,
          createdAt: booking.createdAt,
        }))
      )
      .filter((pair) => pair.userId !== undefined);

    const userIdAndAtCreatedPair = [...organizerIdAndAtCreatedPair, ...attendeeUserIdAndAtCreatedPair];

    const userIdAndAtCreatedPairWithNotAvailableUsers = [
      ...userIdAndAtCreatedPair,
      ...bookingsOfNotAvailableUsersOfInterval.map((booking) => ({
        userId: booking.userId,
        createdAt: booking.createdAt,
      })),
    ];

    const leastRecentlyBookedUser = availableUsers.reduce((leastRecentUser, currentUser) => {
      const currentUserBookings = userIdAndAtCreatedPairWithNotAvailableUsers.filter(
        (pair) => pair.userId === currentUser.id
      );
      const leastRecentUserBookings = userIdAndAtCreatedPairWithNotAvailableUsers.filter(
        (pair) => pair.userId === leastRecentUser.id
      );

      if (currentUserBookings.length === 0 && leastRecentUserBookings.length === 0) {
        return leastRecentUser;
      }

      if (currentUserBookings.length === 0) {
        return currentUser;
      }

      if (leastRecentUserBookings.length === 0) {
        return leastRecentUser;
      }

      const currentUserMostRecentBooking = currentUserBookings.reduce((mostRecent, booking) =>
        booking.createdAt > mostRecent.createdAt ? booking : mostRecent
      );

      const leastRecentUserMostRecentBooking = leastRecentUserBookings.reduce((mostRecent, booking) =>
        booking.createdAt > mostRecent.createdAt ? booking : mostRecent
      );

      return currentUserMostRecentBooking.createdAt < leastRecentUserMostRecentBooking.createdAt
        ? currentUser
        : leastRecentUser;
    });

    return leastRecentlyBookedUser;
  }

  private getUsersAndTheirBookingShortfalls<T extends PartialUser>({
    availableUsers,
    bookingsOfAvailableUsersOfInterval,
    allRRHostsBookingsOfInterval,
    allRRHostsCreatedInInterval,
  }: {
    availableUsers: T[];
    bookingsOfAvailableUsersOfInterval: PartialBooking[];
    allRRHostsBookingsOfInterval: PartialBooking[];
    allRRHostsCreatedInInterval: any[];
  }) {
    const allHostsWithCalibration = this.getHostsWithCalibration({
      allRRHostsCreatedInInterval,
      allRRHostsBookingsOfInterval,
    });

    return availableUsers.map((user) => {
      const userBookings = bookingsOfAvailableUsersOfInterval.filter((booking) => booking.userId === user.id);
      const hostCalibration = allHostsWithCalibration.find((host) => host.userId === user.id);

      return {
        user,
        bookingCount: userBookings.length,
        calibration: hostCalibration?.calibration || 0,
        shortfall: (hostCalibration?.calibration || 0) - userBookings.length,
      };
    });
  }

  private getHostsWithCalibration({
    allRRHostsCreatedInInterval,
    allRRHostsBookingsOfInterval,
  }: {
    allRRHostsCreatedInInterval: any[];
    allRRHostsBookingsOfInterval: PartialBooking[];
  }) {
    const calculateNewHostCalibration = (hostCreatedAt: Date) => {
      const existingBookingsBeforeAdded = allRRHostsBookingsOfInterval.filter(
        (booking) => booking.createdAt < hostCreatedAt
      );
      const hostsAddedBefore = allRRHostsCreatedInInterval.filter((host) => host.createdAt < hostCreatedAt);

      const calibration =
        hostsAddedBefore.length > 0
          ? Math.floor(existingBookingsBeforeAdded.length / hostsAddedBefore.length)
          : 0;

      return calibration;
    };

    return allRRHostsCreatedInInterval.map((host) => ({
      userId: host.userId,
      calibration: calculateNewHostCalibration(host.createdAt),
    }));
  }

  private filterUsersBasedOnWeights<T extends PartialUser>({
    availableUsers,
    eventType,
    usersAndTheirBookingShortfalls,
    allRRHostsCreatedInInterval,
  }: {
    availableUsers: T[];
    eventType: GetLuckyUserParams<any>["eventType"];
    usersAndTheirBookingShortfalls: any[];
    allRRHostsCreatedInInterval: any[];
  }) {
    if (!eventType.isRRWeightsEnabled) {
      const usersWithMaxShortfall = this.getUsersWithHighestPriority(usersAndTheirBookingShortfalls);
      return {
        luckyUser: usersWithMaxShortfall[0]?.user || null,
        remainingUsersAfterWeightFilter: usersWithMaxShortfall.map((item) => item.user),
        usersAndTheirBookingShortfalls,
      };
    }

    const allHostsWithCalibration = this.getHostsWithCalibration({
      allRRHostsCreatedInInterval,
      allRRHostsBookingsOfInterval: [],
    });

    let totalWeight = 0;
    availableUsers.forEach((user) => {
      totalWeight += (user as any).weight || 1;
    });

    let totalCalibration = 0;
    allHostsWithCalibration.forEach((host) => {
      totalCalibration += host.calibration;
    });

    const usersWithBookingShortfalls = availableUsers.map((user) => {
      const userBookings = usersAndTheirBookingShortfalls.find((item) => item.user.id === user.id);
      const expectedBookings = (totalCalibration * ((user as any).weight || 1)) / totalWeight;

      return {
        user,
        bookingCount: userBookings?.bookingCount || 0,
        expectedBookings,
        shortfall: expectedBookings - (userBookings?.bookingCount || 0),
      };
    });

    const maxShortfall = Math.max(...usersWithBookingShortfalls.map((item) => item.shortfall));
    const usersWithMaxShortfall = usersWithBookingShortfalls.filter(
      (item) => item.shortfall === maxShortfall
    );

    const userIdsWithMaxShortfallAndWeight = usersWithMaxShortfall.map((item) => item.user.id);
    const remainingUsersAfterWeightFilter = availableUsers.filter((user) =>
      userIdsWithMaxShortfallAndWeight.includes(user.id)
    );

    return {
      luckyUser: remainingUsersAfterWeightFilter[0] || null,
      remainingUsersAfterWeightFilter,
      usersAndTheirBookingShortfalls: usersWithBookingShortfalls,
    };
  }

  private getUsersWithHighestPriority<T extends { shortfall: number }>(usersAndTheirBookingShortfalls: T[]) {
    const maxShortfall = Math.max(...usersAndTheirBookingShortfalls.map((item) => item.shortfall));
    return usersAndTheirBookingShortfalls.filter((item) => item.shortfall === maxShortfall);
  }

  private getQueueAndAttributeWeightData({
    routingFormResponse,
    attributeWithEnabledWeights,
  }: {
    routingFormResponse: RoutingFormResponse;
    attributeWithEnabledWeights: AttributeWithWeights | null;
  }) {
    if (!attributeWithEnabledWeights || !routingFormResponse) {
      return {
        attributeWeights: null,
        virtualQueuesData: null,
      };
    }

    const routes = zodRoutes.parse(routingFormResponse.form.routes);

    const chosenRoute = routes.find((route) => route.id === routingFormResponse.chosenRouteId);
    if (!chosenRoute) {
      return {
        attributeWeights: null,
        virtualQueuesData: null,
      };
    }

    const attributeWeights = attributeWithEnabledWeights.options.reduce((acc, option) => {
      option.assignedUsers.forEach((assignedUser) => {
        if (!acc[assignedUser.member.userId]) {
          acc[assignedUser.member.userId] = 0;
        }
        acc[assignedUser.member.userId] += assignedUser.weight || 0;
      });
      return acc;
    }, {} as Record<number, number>);

    return {
      attributeWeights,
      virtualQueuesData: null,
    };
  }
}

type FetchedData = {
  bookingsOfAvailableUsersOfInterval: PartialBooking[];
  bookingsOfNotAvailableUsersOfInterval: PartialBooking[];
  allRRHostsBookingsOfInterval: PartialBooking[];
  allRRHostsCreatedInInterval: any[];
  organizersWithLastCreated: any[];
  oooData: any[];
};
