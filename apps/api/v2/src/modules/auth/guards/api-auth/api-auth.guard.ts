import { ExecutionContext, Inject } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { ApiAuthGuardOnlyAllow } from "../../decorators/api-auth-guard-only-allow.decorator";

export class ApiAuthGuard extends AuthGuard("api-auth") {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const allowedMethods = this.reflector.get(ApiAuthGuardOnlyAllow, context.getHandler());
    request.allowedAuthMethods = allowedMethods;

    return request;
  }
}
