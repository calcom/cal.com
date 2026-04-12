import { ApiAuthGuardRequest, ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

@Injectable()
export class OAuthClientGuard implements CanActivate {
  constructor(
    private oAuthClientRepository: OAuthClientRepository,
    private usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiAuthGuardRequest>();
    const organizationId = this.getOrganizationId(context);
    const user: ApiAuthGuardUser = request.user;
    const oAuthClientId = request.params.clientId;

    if (!oAuthClientId) {
      throw new ForbiddenException("OAuthClientGuard - No OAuth client associated with the request.");
    }

    if (!user || !organizationId) {
      throw new ForbiddenException("OAuthClientGuard - No organization associated with the user.");
    }

    const oAuthClient = await this.oAuthClientRepository.getOAuthClient(oAuthClientId);

    if (!oAuthClient) {
      throw new NotFoundException("OAuthClientGuard - OAuth client not found.");
    }

    const allowed = Boolean(user.isSystemAdmin || oAuthClient.organizationId === organizationId);
    if (!allowed) {
      throw new ForbiddenException(
        `OAuthClientGuard - forbidden. oAuth client with id=${oAuthClientId} does not belong to the organization with id=${organizationId}.`
      );
    }
    return true;
  }

  getOrganizationId(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user: UserWithProfile = request.user;
    const authMethodOrganizationId = request.organizationId;
    if (authMethodOrganizationId) return authMethodOrganizationId;

    const userOrganizationId = user ? this.usersService.getUserMainOrgId(user) : null;
    return userOrganizationId;
  }
}
