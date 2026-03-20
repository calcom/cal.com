import { findTeamMembersMatchingAttributeLogic } from "@calcom/platform-libraries";
import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { FindTeamMembersMatchingAttributeQueryDto } from "../inputs/find-team-members-matching-attribute.input";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class AttributesAtomsService {
  private logger = new Logger("AttributesAtomService");

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  private async validateTeamMembership(orgId: number, teamId: number, userId: number): Promise<void> {
    const orgMembership = await this.membershipsRepository.findMembershipByTeamId(orgId, userId);
    if (!orgMembership) throw new ForbiddenException("User is not a member of this organization.");

    const teamMembership = await this.membershipsRepository.findMembershipByTeamId(teamId, userId);
    if (!teamMembership) throw new ForbiddenException("User is not a member of this team.");
  }

  async findTeamMembersMatchingAttribute(
    teamId: number,
    orgId: number,
    userId: number,
    input: FindTeamMembersMatchingAttributeQueryDto
  ) {
    await this.validateTeamMembership(orgId, teamId, userId);

    const {
      teamMembersMatchingAttributeLogic: matchingTeamMembersWithResult,
      mainAttributeLogicBuildingWarnings: mainWarnings,
      fallbackAttributeLogicBuildingWarnings: fallbackWarnings,
      troubleshooter,
    } = await findTeamMembersMatchingAttributeLogic(
      {
        teamId,
        orgId,
        attributesQueryValue: input.attributesQueryValue,
      },
      {
        enablePerf: input.enablePerf,
        concurrency: input.concurrency,
        enableTroubleshooter: input.enablePerf,
      }
    );

    if (!matchingTeamMembersWithResult) {
      return {
        troubleshooter,
        mainWarnings,
        fallbackWarnings,
        result: null,
      };
    }

    const matchingTeamMembersIds = matchingTeamMembersWithResult.map(
      (member: { userId: number }) => member.userId
    );

    const matchingTeamMembers = await this.usersRepository.findByIds(matchingTeamMembersIds);

    return {
      mainWarnings,
      fallbackWarnings,
      troubleshooter: troubleshooter,
      result: matchingTeamMembers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    };
  }
}
