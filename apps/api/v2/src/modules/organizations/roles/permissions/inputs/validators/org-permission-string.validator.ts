import { isValidPermissionStringForScope, Scope } from "@calcom/platform-libraries/pbac";
import { BadRequestException } from "@nestjs/common";
import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ name: "orgPermissionStringValidator", async: false })
export class OrgPermissionStringValidator implements ValidatorConstraintInterface {
  validate(permission: string) {
    const isValid = isValidPermissionStringForScope(permission, Scope.Organization);
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
