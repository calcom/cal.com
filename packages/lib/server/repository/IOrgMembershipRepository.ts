/**
 * ORM-agnostic interface for OrgMembershipRepository
 * This interface defines the contract for organization membership data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface IOrgMembershipRepository {
  getOrgIdsWhereAdmin(loggedInUserId: number): Promise<number[]>;

  isLoggedInUserOrgAdminOfBookingHost(loggedInUserId: number, bookingUserId: number): Promise<boolean>;
}
