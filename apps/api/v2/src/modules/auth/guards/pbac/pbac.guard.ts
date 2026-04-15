import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Pbac } from "@/modules/auth/decorators/pbac/pbac.decorator";

// PBAC (Permission-Based Access Control) is not available in community edition.
// This guard always allows access since there is no permission check service.

@Injectable()
export class PbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ pbacAuthorizedRequest?: boolean }>();
    request.pbacAuthorizedRequest = false;
    return true;
  }
}
