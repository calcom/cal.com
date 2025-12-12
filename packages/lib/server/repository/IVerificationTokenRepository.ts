/**
 * ORM-agnostic interface for VerificationTokenRepository
 * This interface defines the contract for verification token data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface VerificationTokenDto {
  id: number;
  identifier: string;
  token: string;
  expires: Date;
  teamId: number | null;
  createdAt: Date;
  updatedAt: Date;
  expiresInDays: number | null;
}

export interface IVerificationTokenRepository {
  updateTeamInviteTokenExpirationDate(params: {
    email: string;
    teamId: number;
    expiresInDays: number;
  }): Promise<VerificationTokenDto | null>;

  create(params: { identifier: string; token: string; expires: Date }): Promise<VerificationTokenDto>;
}
