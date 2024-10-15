import { timezones } from "./additionalTimezones.json";

export interface Timezone {
  timezone: string;
  city: string;
}

export const additionalTimezones: Timezone[] = timezones;
