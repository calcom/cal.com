import { GetUserReturnType } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

@Injectable()
export class OAuthClientGuard implements CanActivate {
  constructor(private oAuthClientRepository: OAuthClientRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: GetUserReturnType = request.user;
    const organizationId = user?.movedToProfile?.organizationId || user?.organizationId;
    const oAuthClientId = request.clientId;

    if (!oAuthClientId) {
      throw new ForbiddenException("No OAuth client associated with the request.");
    }

    if (!user || !organizationId) {
      throw new ForbiddenException("No organization associated with the user.");
    }

    const oAuthClient = await this.oAuthClientRepository.getOAuthClient(oAuthClientId);

    return Boolean(user.isSystemAdmin || (oAuthClient && oAuthClient.organizationId === organizationId));
  }
}
