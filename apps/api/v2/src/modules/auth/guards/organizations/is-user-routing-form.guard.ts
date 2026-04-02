import type { Team } from "@calcom/prisma/client";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

@Injectable()
export class IsUserRoutingForm implements CanActivate {
  constructor(private readonly dbRead: PrismaReadService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { organization: Team }>();
    const routingFormId: string = request.params.routingFormId;
    const user = request.user as ApiAuthGuardUser;
    if (!routingFormId) {
      throw new ForbiddenException("IsUserRoutingForm - No routing form id found in request params.");
    }

    const userRoutingForm = await this.dbRead.prisma.app_RoutingForms_Form.findFirst({
      where: {
        id: routingFormId,
        userId: Number(user.id),
        teamId: null,
      },
      select: {
        id: true,
      },
    });

    if (!userRoutingForm) {
      throw new ForbiddenException(
        `Routing Form with id=${routingFormId} is not a user Routing Form owned by user with id=${user.id}.`
      );
    }

    return true;
  }
}
