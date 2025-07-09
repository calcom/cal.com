import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

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

    const routingForm = await this.dbRead.prisma.app_RoutingForms_Form.findFirst({
      where: {
        id: routingFormId,
        userId: Number(user.id),
      },
    });

    if (!routingForm) {
      throw new ForbiddenException(
        `IsUserRoutingForm - Routing Form with id=${routingFormId} is not owned by user with id=${user.id}.`
      );
    }

    return true;
  }
}
