/**
 * ORM-agnostic interface for ProfileRepository
 * This interface defines the contract for profile data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface ProfileDto {
  id: number;
  uid: string;
  userId: number;
  organizationId: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileCreateInputDto {
  userId: number;
  organizationId: number;
  username: string;
  uid?: string;
}

export interface ProfileWithOrganizationDto extends ProfileDto {
  organization: {
    id: number;
    slug: string | null;
    name: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    metadata: unknown;
    isPlatform: boolean;
    hideBranding: boolean;
    brandColor: string | null;
    darkBrandColor: string | null;
    theme: string | null;
  };
}

export interface ProfileWithUserDto extends ProfileDto {
  user: {
    id: number;
    name: string | null;
    username: string | null;
    email: string;
    avatarUrl: string | null;
    locale: string | null;
    defaultScheduleId: number | null;
    startTime: number;
    endTime: number;
    bufferTime: number;
    isPlatformManaged: boolean;
  };
}

export interface IProfileRepository {
  /**
   * Create a new profile
   */
  create(data: ProfileCreateInputDto): Promise<ProfileDto>;

  /**
   * Find profile by user ID and organization ID
   */
  findByUserIdAndOrgId(params: { userId: number; organizationId: number }): Promise<ProfileDto | null>;

  /**
   * Find profile by organization ID and username
   */
  findByOrgIdAndUsername(params: { organizationId: number; username: string }): Promise<ProfileDto | null>;

  /**
   * Find profile by UID
   */
  findByUid(uid: string): Promise<ProfileDto | null>;

  /**
   * Find profile by ID
   */
  findById(id: number): Promise<ProfileDto | null>;

  /**
   * Find all profiles for a user
   */
  findManyForUser(userId: number): Promise<ProfileDto[]>;

  /**
   * Find first profile for a user ID
   */
  findFirstForUserId(userId: number): Promise<ProfileDto | null>;

  /**
   * Find all profiles for an organization
   */
  findManyForOrg(organizationId: number): Promise<ProfileDto[]>;

  /**
   * Delete profile by user ID and organization ID
   */
  delete(params: { userId: number; organizationId: number }): Promise<void>;

  /**
   * Delete many profiles by user IDs
   */
  deleteMany(params: { userIds: number[] }): Promise<void>;
}
