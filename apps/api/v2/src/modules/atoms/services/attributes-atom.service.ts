import { findTeamMembersMatchingAttributeLogic } from "@calcom/platform-libraries";
import { Injectable, Logger } from "@nestjs/common";
import { FindTeamMembersMatchingAttributeQueryDto } from "../inputs/find-team-members-matching-attribute.input";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class AttributesAtomsService {
  private logger = new Logger("AttributesAtomService");

  constructor(private readonly usersRepository: UsersRepository) {}

  async findTeamMembersMatchingAttribute(
    teamId: number,
    orgId: number,
    input: FindTeamMembersMatchingAttributeQueryDto
  ) {
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
