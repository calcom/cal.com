/**
 * ORM-agnostic interface for AssignmentReasonRepository
 * This interface defines the contract for assignment reason data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface AssignmentReasonDto {
  id: number;
  reasonString: string;
  reasonEnum: string | null;
  bookingId: number;
  createdAt: Date;
}

export interface IAssignmentReasonRepository {
  findLatestReasonFromBookingUid(bookingUid: string): Promise<AssignmentReasonDto | null>;
}
