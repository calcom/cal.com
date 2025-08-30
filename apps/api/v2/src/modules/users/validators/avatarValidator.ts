import { ValidatorConstraint } from "class-validator";
import type { ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: "avatarValidator", async: false })
export class AvatarValidator implements ValidatorConstraintInterface {
  validate(avatarString: string) {
    // Checks if avatar string is a valid base 64 image
    const regex = /^data:image\/[^;]+;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return regex.test(avatarString);
  }
}
