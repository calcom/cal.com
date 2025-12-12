/**
 * ORM-agnostic interface for UserRepository
 * This interface defines the contract for user data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface UserBasicDto {
  id: number;
  username: string | null;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  timeZone: string;
  locale: string | null;
}

export interface UserDto extends UserBasicDto {
  emailVerified: Date | null;
  bio: string | null;
  startTime: number;
  endTime: number;
  weekStart: string;
  bufferTime: number;
  hideBranding: boolean;
  theme: string | null;
  createdDate: Date;
  trialEndsAt: Date | null;
  completedOnboarding: boolean;
  timeFormat: number | null;
  twoFactorSecret: string | null;
  twoFactorEnabled: boolean;
  backupCodes: string | null;
  identityProviderId: string | null;
  invitedTo: number | null;
  brandColor: string | null;
  darkBrandColor: string | null;
  allowDynamicBooking: boolean;
  allowSEOIndexing: boolean;
  receiveMonthlyDigestEmail: boolean;
  requiresBookerEmailVerification: boolean;
  verified: boolean | null;
  disableImpersonation: boolean;
  locked: boolean;
  movedToProfileId: number | null;
  metadata: unknown;
  isPlatformManaged: boolean;
  lastActiveAt: Date | null;
  identityProvider: string | null;
}

export interface UserWithCredentialsDto extends UserDto {
  credentials: {
    id: number;
    type: string;
    key: unknown;
    userId: number | null;
    teamId: number | null;
    appId: string | null;
    invalid: boolean | null;
  }[];
}

export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(params: { id: number }): Promise<UserDto | null>;

  /**
   * Find user by ID or throw if not found
   */
  findByIdOrThrow(params: { id: number }): Promise<UserDto>;

  /**
   * Find user by email
   */
  findByEmail(params: { email: string }): Promise<UserDto | null>;

  /**
   * Find user by UUID
   */
  findByUuid(params: { uuid: string }): Promise<UserBasicDto | null>;

  /**
   * Find users by IDs
   */
  findByIds(params: { ids: number[] }): Promise<UserDto[]>;

  /**
   * Find user by ID with username
   */
  findByIdWithUsername(params: { id: number }): Promise<{ id: number; username: string | null } | null>;

  /**
   * Get user's timezone and default schedule ID
   */
  getTimeZoneAndDefaultScheduleId(params: {
    userId: number;
  }): Promise<{ timeZone: string; defaultScheduleId: number | null } | null>;

  /**
   * Update user where ID matches
   */
  updateWhereId(params: { id: number; data: Partial<UserDto> }): Promise<UserDto>;
}
