import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import type { User } from "@calcom/prisma/client";

type RequestWithUser = Request & { user?: User };

@Injectable()
export class IsNotManagedUserGuard implements CanActivate {
  constructor(private usersRepository: UsersRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("IsNotManagedUserGuard - No user found in request.");
    }

    if (user.isPlatformManaged) {
      throw new ForbiddenException(
        "IsNotManagedUserGuard - Managed users are not permitted to perform this action."
      );
    }

    return true;
  }
}
