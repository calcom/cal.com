import { Injectable } from "@nestjs/common";

import type { PermissionString, Role } from "@calcom/platform-libraries/pbac";

@Injectable()
export class RolesPermissionsOutputService {
  getPermissionsFromRole(role: Role): PermissionString[] {
    return role.permissions.map(
      (permission) => `${permission.resource}.${permission.action}` as PermissionString
    );
  }
}
