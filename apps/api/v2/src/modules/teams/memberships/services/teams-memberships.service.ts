import { EmailService } from "@/modules/email/email.service";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { CreateTeamMembershipInput } from "@/modules/teams/memberships/inputs/create-team-membership.input";
import { UpdateTeamMembershipInput } from "@/modules/teams/memberships/inputs/update-team-membership.input";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { TeamService } from "@calcom/platform-libraries";

export const PLATFORM_USER_BEING_ADDED_TO_REGULAR_TEAM_ERROR = `Can't add user to team - the user is platform managed user but team is not because team probably was not created using OAuth credentials.`;
export const REGULAR_USER_BEING_ADDED_TO_PLATFORM_TEAM_ERROR = `Can't add user to team - the user is not platform managed user but team is platform managed. Both have to be created using OAuth credentials.`;
export const PLATFORM_USER_AND_PLATFORM_TEAM_CREATED_WITH_DIFFERENT_OAUTH_CLIENTS_ERROR = `Can't add user to team - managed user and team were created using different OAuth clients.`;

@Injectable()
export class TeamsMembershipsService {
  private logger = new Logger("TeamsMembershipsService");

  constructor(
    private readonly teamsMembershipsRepository: TeamsMembershipsRepository,
    private readonly oAuthClientsRepository: OAuthClientRepository,
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly emailService: EmailService
  ) { }

  async createTeamMembership(teamId: number, data: CreateTeamMembershipInput) {
    await this.canUserBeAddedToTeam(data.userId, teamId);
    const teamMembership = await this.teamsMembershipsRepository.createTeamMembership(teamId, data);

    // Send invitation email to the member
    try {
      await this.sendMembershipEmail(teamId, data.userId, data.accepted ?? false);
    } catch (error) {
      this.logger.error(
        `Failed to send membership email for userId ${data.userId} in teamId ${teamId}`,
        error
      );
      // Don't fail the membership creation if email sending fails
    }

    return teamMembership;
  }

  private async sendMembershipEmail(teamId: number, userId: number, accepted: boolean) {
    // Fetch team and user information
    const [team, user] = await Promise.all([
      this.prismaRead.prisma.team.findUnique({
        where: { id: teamId },
        select: {
          name: true,
          slug: true,
          parentId: true,
          isOrganization: true,
          parent: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prismaRead.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          locale: true,
        },
      }),
    ]);

    if (!team || !user) {
      this.logger.warn(
        `Cannot send membership email: team or user not found (teamId: ${teamId}, userId: ${userId})`
      );
      return;
    }

    const isOrg = team.isOrganization && !team.parentId;
    const isAutoJoin = accepted;

    // Generate join link
    let joinLink = `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`;

    // If not auto-accepted, create a verification token
    if (!isAutoJoin) {
      const verificationToken = await this.createVerificationToken(user.email, teamId);
      joinLink = `${WEBAPP_URL}/teams?token=${verificationToken.token}&autoAccept=true`;
    }

    // Send the email
    await this.emailService.sendTeamInviteEmail({
      to: user.email,
      teamName: team.name,
      from: `${team.name}'s admin`,
      joinLink,
      isCalcomMember: true,
      isAutoJoin,
      isOrg,
      parentTeamName: team.parent?.name,
      locale: user.locale,
    });
  }

  private async createVerificationToken(identifier: string, teamId: number) {
    const token = randomBytes(32).toString("hex");
    return this.prismaWrite.prisma.verificationToken.create({
      data: {
        identifier,
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +1 week
        team: {
          connect: {
            id: teamId,
          },
        },
      },
    });
  }

  async getPaginatedTeamMemberships(teamId: number, emails?: string[], skip = 0, take = 250) {
    const emailArray = !emails ? [] : emails;

    return await this.teamsMembershipsRepository.findTeamMembershipsPaginatedWithFilters(
      teamId,
      { emails: emailArray },
      skip,
      take
    );
  }

  async getTeamMembership(teamId: number, membershipId: number) {
    const teamMemberships = await this.teamsMembershipsRepository.findTeamMembership(teamId, membershipId);

    if (!teamMemberships) {
      throw new NotFoundException("Organization's Team membership not found");
    }

    return teamMemberships;
  }

  async updateTeamMembership(teamId: number, membershipId: number, data: UpdateTeamMembershipInput) {
    const teamMembership = await this.teamsMembershipsRepository.updateTeamMembershipById(
      teamId,
      membershipId,
      data
    );
    return teamMembership;
  }

  async deleteTeamMembership(teamId: number, membershipId: number) {
    // First get the membership to get the userId
    const teamMembership = await this.teamsMembershipsRepository.findTeamMembership(teamId, membershipId);

    if (!teamMembership) {
      throw new NotFoundException(`Membership with id ${membershipId} not found in team ${teamId}`);
    }

    await TeamService.removeMembers({ teamIds: [teamId], userIds: [teamMembership.userId], isOrg: false });

    return teamMembership;
  }

  async canUserBeAddedToTeam(userId: number, teamId: number) {
    const [userOAuthClient, teamOAuthClient] = await Promise.all([
      this.oAuthClientsRepository.getByUserId(userId),
      this.oAuthClientsRepository.getByTeamId(teamId),
    ]);

    if (!userOAuthClient && !teamOAuthClient) {
      return true;
    }

    if (userOAuthClient && teamOAuthClient && userOAuthClient.id === teamOAuthClient.id) {
      return true;
    }

    if (!teamOAuthClient) {
      throw new BadRequestException(PLATFORM_USER_BEING_ADDED_TO_REGULAR_TEAM_ERROR);
    }

    if (!userOAuthClient) {
      throw new BadRequestException(REGULAR_USER_BEING_ADDED_TO_PLATFORM_TEAM_ERROR);
    }

    throw new BadRequestException(PLATFORM_USER_AND_PLATFORM_TEAM_CREATED_WITH_DIFFERENT_OAUTH_CLIENTS_ERROR);
  }
}
