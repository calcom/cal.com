import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { BadRequestException, Injectable } from "@nestjs/common";
import { intersectionBy } from "lodash";

@Injectable()
export class MembershipsService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly oAuthClientsRepository: OAuthClientRepository
  ) {}

  async haveMembershipsInCommon(firstUserId: number, secondUserId: number) {
    const memberships = await this.membershipsInCommon(firstUserId, secondUserId);
    return memberships.length > 0;
  }

  async membershipsInCommon(firstUserId: number, secondUserId: number) {
    const firstUserMemberships = await this.membershipsRepository.findUserMemberships(firstUserId);
    const secondUserMemberships = await this.membershipsRepository.findUserMemberships(secondUserId);

    return intersectionBy(
      firstUserMemberships.filter((m) => m.accepted),
      secondUserMemberships.filter((m) => m.accepted),
      "teamId"
    );
  }

  async canUserBeAddedToTeam(userId: number, teamId: number) {
    const [userOAuthClient, teamOAuthClient] = await Promise.all([
      this.oAuthClientsRepository.getByUserId(userId),
      this.oAuthClientsRepository.getByTeamId(teamId),
    ]);

    const userAndTeamAreNotPlatform = !userOAuthClient && !teamOAuthClient;
    if (userAndTeamAreNotPlatform) {
      return true;
    }

    const userAndTeamAreCreatedBySameOAuthClient =
      userOAuthClient && teamOAuthClient && userOAuthClient.id === teamOAuthClient.id;
    if (userAndTeamAreCreatedBySameOAuthClient) {
      return true;
    }

    if (userOAuthClient && !teamOAuthClient) {
      throw new BadRequestException(`Can't add user to team - the user is platform managed user but team is not because team probably
        was not created using OAuth credentials.`);
    }

    if (!userOAuthClient && teamOAuthClient) {
      throw new BadRequestException(`Can't add user to team - the user is not platform managed user but team is platform managed. Both have to be created
        using OAuth credentials.`);
    }

    if (userOAuthClient && teamOAuthClient && userOAuthClient.id !== teamOAuthClient.id) {
      throw new BadRequestException(
        `Can't add user to team - managed user and team were created using different OAuth clients.`
      );
    }

    return true;

  async isUserOrgAdminOrOwnerOfAnotherUser(userId: number, anotherUserId: number) {
    const orgIdsWhereUserIsAdminOrOwner = await this.membershipsRepository.getOrgIdsWhereUserIsAdminOrOwner(
      userId
    );

    if (orgIdsWhereUserIsAdminOrOwner.length === 0) {
      return false;
    }

    const anotherUserOrgMembership = await this.membershipsRepository.getUserMembershipInOneOfOrgs(
      anotherUserId,
      orgIdsWhereUserIsAdminOrOwner
    );

    if (anotherUserOrgMembership) return true;

    const anotherUserOrgTeamMembership = await this.membershipsRepository.getUserMembershipInOneOfOrgsTeams(
      anotherUserId,
      orgIdsWhereUserIsAdminOrOwner
    );

    return !!anotherUserOrgTeamMembership;
  }
}
