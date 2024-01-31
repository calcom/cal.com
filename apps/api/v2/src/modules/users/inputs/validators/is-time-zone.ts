import { ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

import { TIMEZONES } from "@calcom/platform-constants";

@ValidatorConstraint({ name: "isTimeZone", async: false })
export class IsTimeZone implements ValidatorConstraintInterface {
  validate(timeZone: string) {
    if (!timeZone) return true;
    const lowerCaseTimeZone = timeZone.toLowerCase();
    const timeZones = TIMEZONES.map((tz) => tz.toLowerCase());

    return timeZones.includes(lowerCaseTimeZone);
  }

  defaultMessage() {
    return `timeZone must be a string from the list of timezones: ${TIMEZONES.join(", ")}`;
  }
}
