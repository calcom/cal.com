import {
  type NewAccessScope,
  PERMISSION_TO_SCOPE,
  SCOPE_TO_PERMISSION,
} from "@calcom/platform-libraries";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { OAuthPermissions } from "@/modules/auth/decorators/oauth-permissions/oauth-permissions.decorator";
import { TokensService } from "@/modules/tokens/tokens.service";

@Injectable()
export class OAuthPermissionsGuard implements CanActivate {
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

    const decodedToken = this.getDecodedThirdPartyAccessToken(bearerToken);

    if (!decodedToken) {
      return true;
    }

    const tokenScopes: string[] = decodedToken.scope ?? [];

    // note(Lauris): legacy access tokens could have no scopes defined so allow access for backward compatibility.
    if (tokenScopes.length === 0) {
      return true;
    }

    const tokenPermissions = this.resolveTokenPermissions(tokenScopes);

    // note(Lauris): legacy access tokens could have legacy scopes defined that were never enforced
    // so allow access for backward compatibility.
    if (tokenPermissions.size === 0) {
      return true;
    }

    // note(Lauris): read the @OAuthPermissions decorator from the handler to determine which scopes are needed.
    // Endpoints with @OAuthPermissions are accessible to third-party tokens; those without are denied.
    const requiredScopes = this.reflector.get(OAuthPermissions, context.getHandler());

    if (!requiredScopes) {
      throw new ForbiddenException(
        "insufficient_scope: this endpoint is not available for third-party OAuth tokens"
      );
    }

    if (requiredScopes.length === 0) {
      return true;
    }

    // note(Lauris): ORG_ scope implies TEAM_ scope for the same resource.
    // e.g. ORG_PROFILE_READ satisfies TEAM_PROFILE_READ, but not the reverse.
    const tokenScopeSet = new Set(tokenScopes);

    const missingScopes = requiredScopes.filter((scope) => {
      if (tokenScopeSet.has(scope)) return false;
      if (scope.startsWith("TEAM_")) {
        const orgEquivalent = scope.replace("TEAM_", "ORG_");
        if (tokenScopeSet.has(orgEquivalent)) return false;
      }
      return true;
    });

    if (missingScopes.length > 0) {
      throw new ForbiddenException(
        `insufficient_scope: token does not have the required scopes. Required: ${missingScopes.join(", ")}. Token has: ${tokenScopes.join(", ")}`
      );
    }

    return true;
  }

  getDecodedThirdPartyAccessToken(bearerToken: string) {
    return this.tokensService.getDecodedThirdPartyAccessToken(bearerToken);
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
