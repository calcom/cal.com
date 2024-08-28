import { GetUserReturnType } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { UsersService } from "@/modules/users/services/users.service";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class OAuthClientGuard implements CanActivate {
  constructor(private oAuthClientRepository: OAuthClientRepository, private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: GetUserReturnType }>();
    const user: GetUserReturnType = request.user;
    const organizationId = user ? this.usersService.getUserMainOrgId(user) : null;
    const oAuthClientId = request.params.clientId;

    if (!oAuthClientId) {
      throw new ForbiddenException("No OAuth client associated with the request.");
    }

    if (!user || !organizationId) {
      throw new ForbiddenException("No organization associated with the user.");
    }

    const oAuthClient = await this.oAuthClientRepository.getOAuthClient(oAuthClientId);

    if (!oAuthClient) {
      throw new NotFoundException("OAuth client not found.");
    }

    return Boolean(user.isSystemAdmin || oAuthClient.organizationId === organizationId);
  }
}
