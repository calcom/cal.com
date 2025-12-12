import type { MembershipRole } from "@calcom/prisma/enums";

/**
 * ORM-agnostic interface for MembershipRepository
 * This interface defines the contract for membership data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface MembershipDto {
  id: number;
  teamId: number;
  userId: number;
  accepted: boolean;
  role: MembershipRole;
  disableImpersonation: boolean;
}

export interface MembershipCreateInputDto {
  teamId: number;
  userId: number;
  accepted: boolean;
  role: MembershipRole;
  createdAt?: Date;
}

export interface MembershipWithTeamDto extends MembershipDto {
  team: {
    id: number;
    name: string;
    slug: string | null;
    logoUrl: string | null;
    parentId: number | null;
    metadata: unknown;
    isOrganization: boolean;
  };
}

export interface MembershipWithUserDto extends MembershipDto {
  user: {
    email: string;
    name: string | null;
    id: number;
  };
}

export interface IMembershipRepository {
  /**
   * Check if a user has membership in a team
   */
  hasMembership(params: { userId: number; teamId: number }): Promise<boolean>;

  /**
   * List all accepted team member IDs
   */
  listAcceptedTeamMemberIds(params: { teamId: number }): Promise<number[]>;

  /**
   * Create a new membership
   */
  create(data: MembershipCreateInputDto): Promise<MembershipDto>;

  /**
   * Create many memberships
   */
  createMany(data: MembershipCreateInputDto[]): Promise<{ count: number }>;

  /**
   * Find unique membership by user ID and team ID
   */
  findUniqueByUserIdAndTeamId(params: { userId: number; teamId: number }): Promise<MembershipDto | null>;

  /**
   * Find all memberships by user ID
   */
  findAllByUserId(params: {
    userId: number;
    filters?: {
      accepted?: boolean;
      roles?: MembershipRole[];
    };
  }): Promise<
    {
      teamId: number;
      role: MembershipRole;
      team: {
        id: number;
        parentId: number | null;
      };
    }[]
  >;

  /**
   * Find user team IDs
   */
  findUserTeamIds(params: { userId: number }): Promise<number[]>;

  /**
   * Find team admins by team ID
   */
  findTeamAdminsByTeamId(params: { teamId: number }): Promise<
    {
      user: {
        email: string;
        locale: string | null;
      };
    }[]
  >;

  /**
   * Find all memberships by team IDs
   */
  findAllByTeamIds(params: { teamIds: number[] }): Promise<{ userId: number }[]>;

  /**
   * Get admin or owner membership
   */
  getAdminOrOwnerMembership(userId: number, teamId: number): Promise<{ id: number } | null>;

  /**
   * Find first accepted membership by user ID
   */
  findFirstAcceptedMembershipByUserId(userId: number): Promise<MembershipDto | null>;

  /**
   * Find accepted memberships by user IDs in team
   */
  findAcceptedMembershipsByUserIdsInTeam(params: {
    userIds: number[];
    teamId: number;
  }): Promise<MembershipDto[]>;

  /**
   * Find memberships created after time including user
   */
  findMembershipsCreatedAfterTimeIncludeUser(params: {
    organizationId: number;
    time: Date;
  }): Promise<MembershipWithUserDto[]>;
}
