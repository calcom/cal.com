import type { Team } from "@calcom/prisma/client";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { RoutingFormsRepository } from "@/modules/routing-forms/routing-forms.repository";

@Injectable()
export class IsRoutingFormInTeam implements CanActivate {
  constructor(private routingFormsRepository: RoutingFormsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team: Team }>();
    const teamId: string = request.params.teamId;
    const routingFormId: string = request.params.routingFormId;

    if (!routingFormId) {
      throw new ForbiddenException("IsRoutingFormInTeam - No routing form id found in request params.");
    }

    if (!teamId) {
      throw new ForbiddenException("IsRoutingFormInTeam - No team id found in request params.");
    }

    const routingForm = await this.routingFormsRepository.getTeamRoutingForm(Number(teamId), routingFormId);

    if (!routingForm) {
      throw new ForbiddenException(
        `IsRoutingFormInTeam - team with id=(${teamId}) does not own routing form with id=(${routingFormId}).`
      );
    }

    return true;
  }
}
