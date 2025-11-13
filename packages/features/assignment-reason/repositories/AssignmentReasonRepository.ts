import logger from "@calcom/lib/logger";
import type { AssignmentReason, AssignmentReasonEnum, PrismaClient } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["AssignmentReasonRepository"] });

export class AssignmentReasonRepository {
  constructor(private prismaClient: PrismaClient) {}

  /**
   * Creates a new assignment reason record for a booking
   * @param data - The assignment reason data
   * @returns The created assignment reason
   */
  async createAssignmentReason(data: {
    bookingId: number;
    reasonEnum: AssignmentReasonEnum;
    reasonString: string;
  }): Promise<AssignmentReason> {
    log.debug("Creating assignment reason", { bookingId: data.bookingId, reasonEnum: data.reasonEnum });

    return this.prismaClient.assignmentReason.create({
      data: {
        bookingId: data.bookingId,
        reasonEnum: data.reasonEnum,
        reasonString: data.reasonString,
      },
    });
  }

  /**
   * Finds all assignment reasons for a booking
   * @param bookingId - The booking ID
   * @returns Array of assignment reasons
   */
  async findByBookingId(bookingId: number): Promise<AssignmentReason[]> {
    return this.prismaClient.assignmentReason.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Finds the latest assignment reason for a booking
   * @param bookingId - The booking ID
   * @returns The most recent assignment reason or null
   */
  async findLatestByBookingId(bookingId: number): Promise<AssignmentReason | null> {
    return this.prismaClient.assignmentReason.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });
  }
}

