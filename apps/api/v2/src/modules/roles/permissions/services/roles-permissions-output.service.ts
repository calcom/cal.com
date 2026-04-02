import type { PermissionString, Role } from "@calcom/platform-libraries/pbac";
import { Injectable } from "@nestjs/common";

@Injectable()
export class RolesPermissionsOutputService {
  getPermissionsFromRole(role: Role): PermissionString[] {
    return role.permissions.map(
      (permission) => `${permission.resource}.${permission.action}` as PermissionString
    );
  }
}
