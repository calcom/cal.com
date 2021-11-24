import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { CalendarEvent } from "./calendarClient";

const translator = short();

export const getUid = (calEvent: CalendarEvent) => {
  return calEvent.uid ?? translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));
};

export const getCancelLink = (calEvent: CalendarEvent) => {
  return process.env.BASE_URL + "/cancel/" + getUid(calEvent);
};
