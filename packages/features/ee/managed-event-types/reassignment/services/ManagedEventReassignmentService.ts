import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import type { LuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import logger from "@calcom/lib/logger";
import type { Logger } from "@calcom/lib/logger";
import { SchedulingType } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { userSelect } from "@calcom/prisma/selects/user";

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

/**
 * Service for handling automatic managed event reassignments
 * Follows SOLID principles and uses DI for all dependencies
 */
export class ManagedEventReassignmentService {
  private readonly log: Logger;
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

  /**
   * Main orchestration method for automatic managed event reassignment
   */
  async executeAutoReassignment({
    bookingId,
    orgId,
    reassignReason = "Auto-reassigned to another team member",
    reassignedById,
    emailsEnabled = true,
  }: ManagedEventReassignmentParams) {
    const reassignLogger = this.log.getSubLogger({ prefix: [`booking:${bookingId}`] });

    reassignLogger.info(`User ${reassignedById} initiating auto-reassignment`);

    // Step 1: Validate and fetch booking
    await validateManagedEventReassignment({ bookingId });
    const booking = await this.fetchAndValidateBookingForReassignment(bookingId);

    // Step 2: Fetch event type chain
    const { currentChild, parent } = await this.fetchManagedEventTypeChain(
      booking.eventTypeId!,
      reassignLogger
    );

    // Step 3: Find eligible users
    const eligibleUsers = await this.findEligibleReassignmentUsers(
      currentChild.parentId!,
      currentChild.userId,
      orgId,
      reassignLogger
    );

    // Step 4: Filter to available users
    const availableUsers = await this.filterUsersAvailableAtTime(
      eligibleUsers,
      parent,
      {
        start: booking.startTime,
        end: booking.endTime,
        timeZone: parent.timeZone || eligibleUsers[0]?.timeZone || "UTC",
      },
      reassignLogger
    );

    // Step 5: Select user using Lucky User algorithm
    const selectedUser = await this.selectReassignmentUser(availableUsers, parent, reassignLogger);

    // Step 6: Execute the manual reassignment
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

  /**
   * Step 1: Fetches and validates booking for reassignment
   * @private
   */
  private async fetchAndValidateBookingForReassignment(bookingId: number) {
    const booking = await this.bookingRepository.findByIdForReassignment(bookingId);

    if (!booking || !booking.eventTypeId) {
      throw new Error("Booking or event type not found");
    }

    return booking;
  }

  /**
   * Step 2: Fetches the managed event type chain (child → parent)
   * @private
   */
  private async fetchManagedEventTypeChain(
    eventTypeId: number,
    logger: Logger
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

    logger.info("Found parent managed event type", {
      parentId: parentEventType.id,
      currentChildId: currentChildEventType.id,
    });

    return {
      currentChild: currentChildEventType,
      parent: parentEventType,
    };
  }

  /**
   * Step 3: Finds eligible users for reassignment (excluding current user)
   * @private
   */
  private async findEligibleReassignmentUsers(
    parentId: number,
    currentUserId: number | null,
    orgId: number | null,
    logger: Logger
  ): Promise<IsFixedAwareUser[]> {
    // Get all child event types except current user's
    const allChildEventTypes = await this.eventTypeRepository.findManyChildEventTypes(
      parentId,
      currentUserId
    );

    const userIds = allChildEventTypes.map((et) => et.userId).filter((id): id is number => id !== null);

    if (userIds.length === 0) {
      throw new Error("No other users available for reassignment in this managed event");
    }

    // Fetch users with credentials
    const users = await this.userRepository.findManyByIdsWithCredentials({
      userIds,
      select: {
        ...userSelect,
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
      },
    });

    logger.info(`Found ${users.length} potential reassignment targets`);

    // Enrich users with selected calendars and delegation credentials
    const usersWithSelectedCalendars = users.map((user) => withSelectedCalendars(user));
    const enrichedUsers = await enrichUsersWithDelegationCredentials({
      orgId,
      users: usersWithSelectedCalendars,
    });

    return enrichedUsers.map((user) => ({
      ...user,
      isFixed: false,
    })) as IsFixedAwareUser[];
  }

  /**
   * Step 4: Filters users to only those available at the booking time
   * @private
   */
  private async filterUsersAvailableAtTime(
    users: IsFixedAwareUser[],
    parentEventType: NonNullable<Awaited<ReturnType<typeof getEventTypesFromDB>>>,
    timeSlot: { start: Date; end: Date; timeZone: string },
    logger: Logger
  ): Promise<IsFixedAwareUser[]> {
    const availableUsers = await ensureAvailableUsers(
      { ...parentEventType, users },
      {
        dateFrom: dayjs(timeSlot.start).format(),
        dateTo: dayjs(timeSlot.end).format(),
        timeZone: timeSlot.timeZone,
      },
      logger
    );

    if (availableUsers.length === 0) {
      throw new Error("No users available at the booking time");
    }

    logger.info(`${availableUsers.length} users available at booking time`);

    return availableUsers;
  }

  /**
   * Step 5: Selects the best user for reassignment using Lucky User algorithm
   * @private
   */
  private async selectReassignmentUser(
    availableUsers: IsFixedAwareUser[],
    parentEventType: NonNullable<Awaited<ReturnType<typeof getEventTypesFromDB>>>,
    logger: Logger
  ): Promise<IsFixedAwareUser> {
    const selectedUser = await this.luckyUserService.getLuckyUser({
      availableUsers,
      eventType: parentEventType,
      allRRHosts: [],
      routingFormResponse: null,
    });

    if (!selectedUser) {
      throw new Error("Failed to select a user for reassignment");
    }

    logger.info(`Selected user ${selectedUser.id} for reassignment`);

    return selectedUser;
  }
}

