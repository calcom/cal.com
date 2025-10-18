import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ name: "localeValidator", async: false })
export class LocaleValidator implements ValidatorConstraintInterface {
  validate(locale: string) {
    const localeValues = [
      "en",
      "fr",
      "it",
      "ru",
      "es",
      "de",
      "pt",
      "ro",
      "nl",
      "pt-BR",
      "ko",
      "ja",
      "pl",
      "ar",
      "iw",
      "zh-CN",
      "zh-TW",
      "cs",
      "sr",
      "sv",
      "vi",
      "bn",
    ];

    if (localeValues.includes(locale)) return true;

    return false;
  }

  defaultMessage() {
    return "Please include a valid locale";
  }
}
