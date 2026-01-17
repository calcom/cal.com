import type { PrismaClient } from "@calcom/prisma";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";
import type { LuckyUserService } from "@calcom/features/bookings/lib/getLuckyUser";
import { ManagedEventManualReassignmentService } from "./ManagedEventManualReassignmentService";
import { ManagedEventReassignmentService } from "./ManagedEventReassignmentService";
import { ManagedEventAssignmentReasonService } from "./ManagedEventAssignmentReasonRecorder";

/**
 * Dependency Injection Container for Reassignment Services
 * 
 * This ensures:
 * - Repositories are only instantiated once per request
 * - Services receive explicit dependencies via constructor
 * - No direct `new Repository(prisma)` calls in business logic
 */
export class ReassignmentServiceContainer {
  private readonly prisma: PrismaClient;
  private readonly bookingRepository: BookingRepository;
  private readonly userRepository: UserRepository;
  private readonly eventTypeRepository: EventTypeRepository;
  private readonly assignmentReasonRepository: AssignmentReasonRepository;
  private readonly assignmentReasonService: ManagedEventAssignmentReasonService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.bookingRepository = new BookingRepository(prisma);
    this.userRepository = new UserRepository(prisma);
    this.eventTypeRepository = new EventTypeRepository(prisma);
    this.assignmentReasonRepository = new AssignmentReasonRepository(prisma);
    this.assignmentReasonService = new ManagedEventAssignmentReasonService({
      userRepository: this.userRepository,
      assignmentReasonRepository: this.assignmentReasonRepository,
    });
  }

  /**
   * Creates an instance of ManagedEventManualReassignmentService
   * with all required dependencies injected
   */
  getManagedEventManualReassignmentService(): ManagedEventManualReassignmentService {
    return new ManagedEventManualReassignmentService({
      prisma: this.prisma,
      bookingRepository: this.bookingRepository,
      userRepository: this.userRepository,
      eventTypeRepository: this.eventTypeRepository,
      assignmentReasonService: this.assignmentReasonService,
    });
  }

  /**
   * Creates an instance of ManagedEventReassignmentService
   * with all required dependencies injected
   * @param luckyUserService - The lucky user service for round-robin selection
   */
  getManagedEventReassignmentService(luckyUserService: LuckyUserService): ManagedEventReassignmentService {
    return new ManagedEventReassignmentService({
      bookingRepository: this.bookingRepository,
      userRepository: this.userRepository,
      eventTypeRepository: this.eventTypeRepository,
      luckyUserService,
    });
  }

  /**
   * Access to repositories for utilities that need them
   * These should be passed as parameters to pure functions
   */
  getRepositories() {
    return {
      bookingRepository: this.bookingRepository,
      userRepository: this.userRepository,
      eventTypeRepository: this.eventTypeRepository,
    };
  }
}

/**
 * Factory function for creating the reassignment service
 * This is the main entry point for external code
 */
export function createManagedEventManualReassignmentService(prisma: PrismaClient) {
  const container = new ReassignmentServiceContainer(prisma);
  return container.getManagedEventManualReassignmentService();
}

/**
 * Factory function for creating the auto-reassignment service
 * @param luckyUserService - The lucky user service for round-robin selection
 */
export function createManagedEventReassignmentService(
  prisma: PrismaClient,
  luckyUserService: LuckyUserService
) {
  const container = new ReassignmentServiceContainer(prisma);
  return container.getManagedEventReassignmentService(luckyUserService);
}

