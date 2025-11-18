import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";
import * as tzdata from "tzdata";

@ValidatorConstraint({ name: "timezoneValidator", async: false })
export class TimeZoneValidator implements ValidatorConstraintInterface {
  validate(timeZone: string) {
    const timeZoneList = Object.keys(tzdata.zones);

    if (timeZoneList.includes(timeZone)) return true;

    return false;
  }

  defaultMessage() {
    return "Please include a valid time zone";
  }
}
