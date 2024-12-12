import { AppConfig } from "@/config/type";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { StripeService } from "@/modules/stripe/stripe.service";
import { CreateTeamInput } from "@/modules/teams/teams/inputs/create-team.input";
import { UpdateTeamDto } from "@/modules/teams/teams/inputs/update-team.input";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TeamsService {
  private isTeamBillingEnabled = this.configService.get("stripe.isTeamBillingEnabled");

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService
  ) {}

  async createTeam(input: CreateTeamInput, ownerId: number) {
    const { autoAcceptCreator, ...teamData } = input;

    if (!this.isTeamBillingEnabled) {
      const team = await this.teamsRepository.create(teamData);
      await this.membershipsRepository.createMembership(team.id, ownerId, "OWNER", !!autoAcceptCreator);
      return team;
    }

    const pendingTeam = await this.teamsRepository.create({ ...teamData, pendingPayment: true });

    const checkoutSession = await this.stripeService.generateTeamCheckoutSession(pendingTeam.id, ownerId);

    if (!checkoutSession.url) {
      await this.teamsRepository.delete(pendingTeam.id);
      throw new InternalServerErrorException({
        message: `Failed generating team Stripe checkout session URL which is why team creation was cancelled. Please contact support.`,
      });
    }

    return {
      message:
        "Your team will be created once we receive your payment. Please complete the payment using the payment link.",
      paymentLink: checkoutSession.url,
      pendingTeam,
    };
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
