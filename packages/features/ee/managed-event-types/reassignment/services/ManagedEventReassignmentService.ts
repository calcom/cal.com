import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import type { LuckyUserService } from "@calcom/features/bookings/lib/getLuckyUser";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { SchedulingType } from "@calcom/prisma/enums";

import { managedEventManualReassignment } from "../managedEventManualReassignment";
import { validateManagedEventReassignment } from "../utils";

interface ManagedEventReassignmentParams {
  bookingId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
}

interface ManagedEventTypeChain {
  currentChild: {
    id: number;
    parentId: number | null;
    userId: number | null;
  };
  parent: Awaited<ReturnType<typeof getEventTypesFromDB>>;
}

interface ManagedEventReassignmentServiceDeps {
  bookingRepository: BookingRepository;
  eventTypeRepository: EventTypeRepository;
  userRepository: UserRepository;
  luckyUserService: LuckyUserService;
}

export class ManagedEventReassignmentService {
  private readonly log: typeof logger;
  private readonly bookingRepository: BookingRepository;
  private readonly eventTypeRepository: EventTypeRepository;
  private readonly userRepository: UserRepository;
  private readonly luckyUserService: LuckyUserService;

  constructor(deps: ManagedEventReassignmentServiceDeps) {
    this.bookingRepository = deps.bookingRepository;
    this.eventTypeRepository = deps.eventTypeRepository;
    this.userRepository = deps.userRepository;
    this.luckyUserService = deps.luckyUserService;
    this.log = logger.getSubLogger({ prefix: ["ManagedEventReassignmentService"] });
  }

  async executeAutoReassignment({
    bookingId,
    orgId,
    reassignReason = "Auto-reassigned to another team member",
    reassignedById,
    emailsEnabled = true,
  }: ManagedEventReassignmentParams) {
    const reassignLogger = this.log.getSubLogger({ prefix: [`booking:${bookingId}`] });

    reassignLogger.info(`User ${reassignedById} initiating auto-reassignment`);

    await validateManagedEventReassignment({ bookingId, bookingRepository: this.bookingRepository });
    const booking = await this.fetchAndValidateBookingForReassignment(bookingId);

    const { currentChild, parent } = await this.fetchManagedEventTypeChain(
      booking.eventTypeId!,
      reassignLogger
    );

    const eligibleUsers = await this.findEligibleReassignmentUsers(
      currentChild.parentId!,
      currentChild.userId,
      orgId,
      reassignLogger
    );

    const availableUsers = await ensureAvailableUsers(
      { ...parent, users: eligibleUsers },
      {
        dateFrom: dayjs(booking.startTime).format(),
        dateTo: dayjs(booking.endTime).format(),
        timeZone: parent.timeZone || eligibleUsers[0]?.timeZone || "UTC",
      },
      reassignLogger
    );

    reassignLogger.info(`${availableUsers.length} users available at booking time`);

    const selectedUser = await this.selectReassignmentUser(availableUsers, parent, reassignLogger);

    return await managedEventManualReassignment({
      bookingId,
      newUserId: selectedUser.id,
      orgId,
      reassignReason,
      reassignedById,
      emailsEnabled,
      isAutoReassignment: true,
    });
  }

  private async fetchAndValidateBookingForReassignment(bookingId: number) {
    const booking = await this.bookingRepository.findByIdForReassignment(bookingId);

    if (!booking || !booking.eventTypeId) {
      throw new Error("Booking or event type not found");
    }

    return booking;
  }

  private async fetchManagedEventTypeChain(
    eventTypeId: number,
    log: typeof logger
  ): Promise<ManagedEventTypeChain> {
    const currentChildEventType = await this.eventTypeRepository.findByIdWithParent(eventTypeId);

    if (!currentChildEventType || !currentChildEventType.parentId) {
      throw new Error("Booking is not on a managed event type");
    }

    const parentEventType = await getEventTypesFromDB(currentChildEventType.parentId);

    if (!parentEventType) {
      throw new Error("Parent event type not found");
    }

    if (parentEventType.schedulingType !== SchedulingType.MANAGED) {
      throw new Error("Parent event type must be a MANAGED type");
    }

    log.info("Found parent managed event type", {
      parentId: parentEventType.id,
      currentChildId: currentChildEventType.id,
    });

    return {
      currentChild: currentChildEventType,
      parent: parentEventType,
    };
  }

  private async findEligibleReassignmentUsers(
    parentId: number,
    currentUserId: number | null,
    orgId: number | null,
    log: typeof logger
  ): Promise<IsFixedAwareUser[]> {
    const allChildEventTypes = await this.eventTypeRepository.findManyChildEventTypes(
      parentId,
      currentUserId
    );

    const userIds = allChildEventTypes.map((et) => et.userId).filter((id): id is number => id !== null);

    if (userIds.length === 0) {
      throw new Error("No other users available for reassignment in this managed event");
    }

    const usersWithSelectedCalendars =
      await this.userRepository.findManyByIdsWithCredentialsAndSelectedCalendars({
        userIds,
      });

    log.info(`Found ${usersWithSelectedCalendars.length} potential reassignment targets`);

    const enrichedUsers = await enrichUsersWithDelegationCredentials({
      orgId,
      users: usersWithSelectedCalendars,
    });

    const usersWithSchedules = enrichedUsers.filter((user) => {
      const hasSchedules = user.schedules && user.schedules.length > 0;
      if (!hasSchedules) {
        log.warn(`User ${user.id} skipped: no schedules configured`);
      }
      return hasSchedules;
    });

    if (usersWithSchedules.length === 0) {
      throw new Error(
        "No eligible users found for reassignment. All team members must have availability schedules configured."
      );
    }

    log.info(`${usersWithSchedules.length} users with schedules configured`);

    return usersWithSchedules.map((user) => ({
      ...user,
      isFixed: false as const,
    })) as unknown as IsFixedAwareUser[];
  }

  private async selectReassignmentUser(
    availableUsers: [IsFixedAwareUser, ...IsFixedAwareUser[]],
    parentEventType: NonNullable<Awaited<ReturnType<typeof getEventTypesFromDB>>>,
    log: typeof logger
  ): Promise<IsFixedAwareUser> {
    const luckyUser: IsFixedAwareUser = await this.luckyUserService.getLuckyUser({
      availableUsers,
      eventType: parentEventType,
      allRRHosts: [],
      routingFormResponse: null,
    });

    if (!luckyUser) {
      throw new Error("Failed to select a user for reassignment");
    }

    log.info(`Selected user ${luckyUser.id} for reassignment`);

    return luckyUser;
  }
}
