import { BadRequestException } from "@nestjs/common";
import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

import { isValidPermissionString } from "@calcom/platform-libraries/pbac";

@ValidatorConstraint({ name: "permissionStringValidator", async: false })
export class PermissionStringValidator implements ValidatorConstraintInterface {
  validate(permission: string) {
    const isValid = isValidPermissionString(permission);
    if (!isValid) {
      throw new BadRequestException(
        `Permission '${permission}' must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')`
      );
    }
    return true;
  }

  defaultMessage() {
    return "Permission must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')";
  }
}
