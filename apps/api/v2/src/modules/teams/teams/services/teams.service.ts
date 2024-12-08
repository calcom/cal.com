import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { CreateTeamInput } from "@/modules/teams/teams/inputs/create-team.input";
import { UpdateTeamDto } from "@/modules/teams/teams/inputs/update-team.input";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  async createTeam(input: CreateTeamInput, ownerId: number) {
    const { autoAcceptCreator, ...teamData } = input;

    const team = await this.teamsRepository.create(teamData);
    await this.membershipsRepository.createMembership(team.id, ownerId, "OWNER", !!autoAcceptCreator);
    return team;
  }

  async getUserTeams(userId: number) {
    const memberships = await this.membershipsRepository.findUserMemberships(userId);
    const teamIds = memberships.map((m) => m.teamId);
    const teams = await this.teamsRepository.getByIds(teamIds);
    return teams;
  }

  async updateTeam(teamId: number, data: UpdateTeamDto) {
    const team = await this.teamsRepository.update(teamId, data);
    return team;
  }
}
