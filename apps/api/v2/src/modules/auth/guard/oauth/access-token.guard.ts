import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly oauthFlowService: OAuthFlowService) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    const bearer = authHeader?.replace("Bearer ", "").trim();
    if (!bearer) {
      throw new UnauthorizedException();
    }

    return this.oauthFlowService.validateAccessToken(bearer);
  }
}
