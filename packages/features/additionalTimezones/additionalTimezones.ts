import * as additionalTimezones from "./additionalTimezones.json";

export interface Timezone {
  timezone: string;
  city: string;
}

export const timezones: Timezone[] = additionalTimezones.timezones;

export default additionalTimezones;
