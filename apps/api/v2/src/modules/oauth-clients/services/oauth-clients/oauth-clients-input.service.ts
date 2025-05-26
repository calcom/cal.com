import { JwtService } from "@/modules/jwt/jwt.service";
import { Injectable } from "@nestjs/common";

import { PERMISSION_MAP } from "@calcom/platform-constants";
import { CreateOAuthClientInput } from "@calcom/platform-types";

@Injectable()
export class OAuthClientsInputService {
  constructor(private readonly jwtService: JwtService) {}

  transformCreateOAuthClientInput(input: CreateOAuthClientInput) {
    const transformed = {
      ...input,
      permissions: this.transformPermissions(input.permissions),
    };

    return {
      ...transformed,
      secret: this.jwtService.sign(transformed),
    };
  }

  transformPermissions(permissions: Array<keyof typeof PERMISSION_MAP | "*">): number {
    const values = permissions.includes("*")
      ? Object.values(PERMISSION_MAP)
      : permissions.map((p) => PERMISSION_MAP[p as keyof typeof PERMISSION_MAP]);
    return values.reduce((acc, val) => acc | val, 0);
  }
}
