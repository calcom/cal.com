import { ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

import { cityTimezonesHandler, addCitiesToDropdown } from "@calcom/platform-libraries";

async function getAllowedTimezones() {
  const timezones = await cityTimezonesHandler();
  const formatted = addCitiesToDropdown(timezones);
  return Object.keys(formatted);
}

@ValidatorConstraint({ name: "isTimeZone", async: false })
export class IsTimeZone implements ValidatorConstraintInterface {
  allowedTimezones: string[] = [];

  async validate(timeZone: string) {
    if (!timeZone) return false;
    this.allowedTimezones = await getAllowedTimezones();
    const lowerCaseTimeZone = timeZone.toLowerCase();
    const lowercaseTimeZones = this.allowedTimezones.map((tz) => tz.toLowerCase());

    return lowercaseTimeZones.includes(lowerCaseTimeZone);
  }

  defaultMessage() {
    return `timeZone must be a string from the list of timezones: ${this.allowedTimezones.join(", ")}`;
  }
}
