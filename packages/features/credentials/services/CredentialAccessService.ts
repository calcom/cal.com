import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { HttpError } from "@calcom/lib/http-error";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";

type CredentialAccessInput = {
  credentialId: number;
  loggedInUserId: number;
  bookingOwnerId: number | null;
};

type UserTeamsData = {
  organizationId: number | null;
  teams: Array<{ teamId: number }>;
} | null;

export class CredentialAccessService {
  private readonly userRepository: UserRepository;

  constructor(private readonly prismaClient: PrismaClient = prisma) {
    this.userRepository = new UserRepository(this.prismaClient);
  }

  /**
   * Ensures that a credential is accessible by the logged-in user or booking owner.
   */
  async ensureAccessible(input: CredentialAccessInput): Promise<void> {
    const credential = await this.checkCredentialExists(input.credentialId);

    if (this.checkUserOwnership(credential, input.loggedInUserId)) {
      return;
    }

    if (this.checkBookingOwnerOwnership(credential, input.bookingOwnerId)) {
      return;
    }

    await this.checkTeamAccess(credential, input.loggedInUserId, input.bookingOwnerId);
  }

  private async checkCredentialExists(credentialId: number) {
    const credential = await CredentialRepository.findFirstByIdWithKeyAndUser({
      id: credentialId,
    });

    if (!credential) {
      throw new HttpError({
        statusCode: 404,
        message: "Credential not found",
      });
    }

    return credential;
  }

  private checkUserOwnership(
    credential: Awaited<ReturnType<typeof CredentialRepository.findFirstByIdWithKeyAndUser>>,
    loggedInUserId: number
  ): boolean {
    return credential?.userId === loggedInUserId;
  }

  private checkBookingOwnerOwnership(
    credential: Awaited<ReturnType<typeof CredentialRepository.findFirstByIdWithKeyAndUser>>,
    bookingOwnerId: number | null
  ): boolean {
    return bookingOwnerId !== null && credential?.userId === bookingOwnerId;
  }

  private async checkTeamAccess(
    credential: NonNullable<Awaited<ReturnType<typeof CredentialRepository.findFirstByIdWithKeyAndUser>>>,
    loggedInUserId: number,
    bookingOwnerId: number | null
  ): Promise<void> {
    if (!credential.teamId) {
      this.throwForbiddenError();
    }

    const [loggedInUserTeams, bookingOwnerTeams] = await this.getUserTeamsData(
      loggedInUserId,
      bookingOwnerId
    );

    if (this.hasTeamAccess(credential.teamId, loggedInUserTeams)) {
      return;
    }

    if (this.hasTeamAccess(credential.teamId, bookingOwnerTeams)) {
      return;
    }

    this.throwForbiddenError();
  }

  private async getUserTeamsData(
    loggedInUserId: number,
    bookingOwnerId: number | null
  ): Promise<[UserTeamsData, UserTeamsData]> {
    return Promise.all([
      this.userRepository.getUserOrganizationAndTeams({ userId: loggedInUserId }),
      bookingOwnerId
        ? this.userRepository.getUserOrganizationAndTeams({ userId: bookingOwnerId })
        : Promise.resolve(null),
    ]);
  }

  private hasTeamAccess(teamId: number, userTeams: UserTeamsData): boolean {
    if (!userTeams) {
      return false;
    }

    const teamIds = this.getTeamIdsForUser(userTeams);
    return teamIds.includes(teamId);
  }

  private getTeamIdsForUser(userTeams: NonNullable<UserTeamsData>): number[] {
    return [
      ...(userTeams.organizationId ? [userTeams.organizationId] : []),
      ...(userTeams.teams || []).map((t) => t.teamId),
    ];
  }

  private throwForbiddenError(): never {
    throw new HttpError({
      statusCode: 403,
      message: "You do not have access to this credential",
    });
  }
}
