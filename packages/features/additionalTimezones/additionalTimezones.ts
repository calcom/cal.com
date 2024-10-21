import * as additionalTimezones from "./additionalTimezones.json";

export interface Timezone {
  name: string;
  identifier: string;
}

export const timezones: Timezone[] = additionalTimezones.timezones;

export default additionalTimezones;
