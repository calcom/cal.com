import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";

@Injectable()
export class IsUserInTeam implements CanActivate {
  constructor(private readonly membershipsRepository: MembershipsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const teamId: string = request.params.teamId;
    const userId: string = request.params.userId;

    if (!userId) {
      throw new ForbiddenException("IsUserInTeam - No user id found in request params.");
    }

    if (!teamId) {
      throw new ForbiddenException("IsUserInTeam - No team id found in request params.");
    }

    const parsedUserId = Number(userId);
    const parsedTeamId = Number(teamId);

    if (!Number.isInteger(parsedUserId) || parsedUserId < 1) {
      throw new BadRequestException(
        `IsUserInTeam - Invalid userId: '${userId}' is not a valid number. Please provide a number that is larger than 0.`
      );
    }

    if (!Number.isInteger(parsedTeamId) || parsedTeamId < 1) {
      throw new BadRequestException(
        `IsUserInTeam - Invalid teamId: '${teamId}' is not a valid number. Please provide a number that is larger than 0.`
      );
    }

    const membership = await this.membershipsRepository.findMembershipByTeamId(parsedTeamId, parsedUserId);

    if (membership) {
      return true;
    }

    throw new ForbiddenException(
      `IsUserInTeam - user with id=${userId} is not a member of the team with id=${teamId}.`
    );
  }
}
