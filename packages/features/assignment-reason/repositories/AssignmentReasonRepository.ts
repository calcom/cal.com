import logger from "@calcom/lib/logger";
import type { AssignmentReason, AssignmentReasonEnum } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma";

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
  async findByBookingId(bookingId: number): Promise<Omit<AssignmentReason, "id">[]> {
    return this.prismaClient.assignmentReason.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        bookingId: true,
        reasonEnum: true,
        reasonString: true,
      },
    });
  }

  /**
   * Finds the latest assignment reason for a booking
   * @param bookingId - The booking ID
   * @returns The most recent assignment reason or null
   */
  async findLatestByBookingId(bookingId: number): Promise<Omit<AssignmentReason, "id"> | null> {
    return this.prismaClient.assignmentReason.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        bookingId: true,
        reasonEnum: true,
        reasonString: true,
      },
    });
  }
}
