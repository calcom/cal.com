import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js/max";
import { describe, expect, it } from "vitest";

/**
 * Mirror of CUSTOM_PHONE_MASKS from PhoneInput.tsx.
 * We duplicate it here because the component file has React/DOM dependencies
 * that make it hard to import in a pure unit test without a full browser env.
 */
const CUSTOM_PHONE_MASKS: Record<string, string> = {
  ci: ".. .. .. .. ..",
  bj: ".. .. .. .. ..",
  at: "... ..........",
  ar: "(..) .........",
  fi: ".. ... .. ...",
};

/** Count the digit placeholders (dots) in a react-phone-input-2 mask */
const countMaskDigits = (mask: string): number => (mask.match(/\./g) || []).length;

/**
 * Test phone numbers that must be accepted for each country with a custom mask.
 * These are realistic mobile and landline numbers validated by libphonenumber-js.
 */
const COUNTRY_TEST_NUMBERS: Record<string, { number: string; description: string }[]> = {
  ci: [{ number: "+2250797764877", description: "Ivory Coast 10-digit mobile" }],
  bj: [{ number: "+2290165526657", description: "Benin 10-digit mobile" }],
  at: [{ number: "+436641234567", description: "Austria mobile" }],
  ar: [
    { number: "+5491112345678", description: "Argentina mobile (Buenos Aires, 11 national digits)" },
    { number: "+5493414123456", description: "Argentina mobile (Rosario, 11 national digits)" },
    { number: "+541112345678", description: "Argentina landline (10 national digits)" },
  ],
  fi: [
    { number: "+3584012345678", description: "Finland 10-digit mobile" },
    { number: "+358501234567", description: "Finland 9-digit mobile" },
  ],
};

describe("CUSTOM_PHONE_MASKS", () => {
  describe.each(Object.entries(CUSTOM_PHONE_MASKS))("mask for %s", (countryCode, mask) => {
    const maskDigits = countMaskDigits(mask);
    const testNumbers = COUNTRY_TEST_NUMBERS[countryCode] || [];

    it("should have enough digit placeholders for all valid phone numbers", () => {
      for (const { number, description } of testNumbers) {
        const parsed = parsePhoneNumberFromString(number);
        expect(parsed, `Failed to parse ${description}: ${number}`).toBeTruthy();

        const nationalDigits = parsed!.nationalNumber.length;
        expect(maskDigits).toBeGreaterThanOrEqual(
          nationalDigits,
          `Mask for ${countryCode} has ${maskDigits} digit slots but ${description} (${number}) needs ${nationalDigits} national digits`
        );
      }
    });

    it("should have test numbers that pass libphonenumber-js validation", () => {
      for (const { number, description } of testNumbers) {
        expect(isValidPhoneNumber(number), `${description} (${number}) should be a valid phone number`).toBe(
          true
        );
      }
    });
  });
});
