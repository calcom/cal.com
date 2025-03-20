import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

import { ApiAuthGuardRequest, ApiAuthGuardUser } from "../../auth/strategies/api-auth/api-auth.strategy";
import { OAuthClientRepository } from "../../oauth-clients/oauth-client.repository";
import { UsersService } from "../../users/services/users.service";
import { UserWithProfile } from "../../users/users.repository";

@Injectable()
export class OAuthClientGuard implements CanActivate {
  constructor(private oAuthClientRepository: OAuthClientRepository, private usersService: UsersService) {}

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

    return Boolean(user.isSystemAdmin || oAuthClient.organizationId === organizationId);
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
