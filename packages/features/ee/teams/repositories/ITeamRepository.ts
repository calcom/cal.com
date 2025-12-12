/**
 * ORM-agnostic interface for TeamRepository
 * This interface defines the contract for team data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface TeamDto {
  id: number;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  parentId: number | null;
  metadata: unknown;
  isOrganization: boolean;
  isPlatform: boolean;
}

export interface TeamWithMembersDto extends TeamDto {
  members: {
    accepted: boolean;
  }[];
}

export interface TeamSlugDto {
  slug: string | null;
}

export interface TeamWithHideBrandingDto {
  hideBranding: boolean;
  parent: {
    hideBranding: boolean;
  } | null;
}

export interface ITeamRepository {
  /**
   * Find team by ID
   */
  findById(params: { id: number }): Promise<TeamDto | null>;

  /**
   * Find team by ID including platform billing
   */
  findByIdIncludePlatformBilling(params: { id: number }): Promise<TeamDto | null>;

  /**
   * Find all teams by parent ID
   */
  findAllByParentId(params: { parentId: number }): Promise<TeamDto[]>;

  /**
   * Find team by ID and parent ID
   */
  findByIdAndParentId(params: { id: number; parentId: number }): Promise<TeamDto | null>;

  /**
   * Find team with members
   */
  findTeamWithMembers(teamId: number): Promise<TeamWithMembersDto | null>;

  /**
   * Find team slug by ID
   */
  findTeamSlugById(params: { id: number }): Promise<TeamSlugDto | null>;

  /**
   * Find team with parent hide branding
   */
  findTeamWithParentHideBranding(params: { teamId: number }): Promise<TeamWithHideBrandingDto | null>;

  /**
   * Find parent organization by team ID
   */
  findParentOrganizationByTeamId(teamId: number): Promise<{ id: number } | null>;

  /**
   * Delete team by ID
   */
  deleteById(params: { id: number }): Promise<TeamDto>;

  /**
   * Check if slug is available for update
   */
  isSlugAvailableForUpdate(params: {
    slug: string;
    teamId: number;
    parentId?: number | null;
  }): Promise<boolean>;

  /**
   * Find teams for credit check
   */
  findTeamsForCreditCheck(params: { teamIds: number[] }): Promise<
    {
      id: number;
      isOrganization: boolean;
      parentId: number | null;
      parent: { id: number } | null;
    }[]
  >;
}
