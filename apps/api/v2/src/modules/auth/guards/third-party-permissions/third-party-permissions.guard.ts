import {
  type NewAccessScope,
  PERMISSION_TO_SCOPE,
  SCOPE_TO_PERMISSION,
} from "@calcom/platform-libraries";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { TokensService } from "@/modules/tokens/tokens.service";

@Injectable()
export class ThirdPartyPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tokensService: TokensService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const bearerToken = request.get("Authorization")?.replace("Bearer ", "");

    if (!bearerToken) {
      return true;
    }

    const decodedToken = this.tokensService.getDecodedThirdPartyAccessToken(bearerToken);

    if (!decodedToken) {
      return true;
    }

    const tokenScopes: string[] = decodedToken.scope ?? [];

    // note(Lauris): legacy access tokens could have no scopes defined so allow access for backward compatibility.
    if (tokenScopes.length === 0) {
      return true;
    }

    const tokenPermissions = this.resolveTokenPermissions(tokenScopes);

    // note(Lauris): legacy access tokens could have legacy scopes defined that were never enforce
    // so allow acceess for backward compatibility.
    if (tokenPermissions.size === 0) {
      return true;
    }

    // note(Lauris): read the @Permissions decorator from the handler to determine which scopes are needed.
    // Endpoints with @Permissions are accessible to third-party tokens; those without are denied.
    const requiredPermissions = this.reflector.get(Permissions, context.getHandler());

    if (!requiredPermissions) {
      throw new ForbiddenException(
        "insufficient_scope: this endpoint is not available for third-party OAuth tokens"
      );
    }

    if (requiredPermissions.length === 0) {
      return true;
    }

    const missingPermissions = requiredPermissions.filter(
      (permission: number) => !tokenPermissions.has(permission)
    );

    if (missingPermissions.length > 0) {
      const missingScopeNames = missingPermissions
        .map((permission: number) => PERMISSION_TO_SCOPE[permission])
        .filter(Boolean);
      throw new ForbiddenException(
        `insufficient_scope: token does not have the required scopes. Required: ${missingScopeNames.join(", ")}. Token has: ${tokenScopes.join(", ")}`
      );
    }

    return true;
  }

  private resolveTokenPermissions(scopes: string[]): Set<number> {
    const permissions = new Set<number>();
    for (const scope of scopes) {
      if (scope in SCOPE_TO_PERMISSION) {
        permissions.add(SCOPE_TO_PERMISSION[scope as NewAccessScope]);
      }
    }
    return permissions;
  }
}
