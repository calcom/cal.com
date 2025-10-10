import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

import { isValidPermissionString } from "@calcom/platform-libraries/pbac";

@ValidatorConstraint({ name: "permissionStringValidator", async: false })
export class PermissionStringValidator implements ValidatorConstraintInterface {
  validate(permission: string) {
    return isValidPermissionString(permission);
  }

  defaultMessage() {
    return "Permission must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')";
  }
}
