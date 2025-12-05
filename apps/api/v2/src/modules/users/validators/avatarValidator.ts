import { ValidatorConstraint } from "class-validator";
import type { ValidatorConstraintInterface } from "class-validator";

const BASE64_IMAGE_REGEX =
  /^data:image\/[^;]+;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

@ValidatorConstraint({ name: "avatarValidator", async: false })
export class AvatarValidator implements ValidatorConstraintInterface {
  validate(avatarString: string): boolean {
    if (!avatarString) return true;

    return this.isValidUrl(avatarString) || this.isValidBase64Image(avatarString);
  }

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private isValidBase64Image(value: string): boolean {
    return BASE64_IMAGE_REGEX.test(value);
  }

  defaultMessage(): string {
    return "avatarUrl must be a valid URL or base64 encoded image";
  }
}
