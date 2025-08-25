import { createCachedImport } from "../createCachedImport";

const calendarLoaders = {
  applecalendar: createCachedImport(() => import("../../applecalendar")),
  caldavcalendar: createCachedImport(() => import("../../caldavcalendar")),
  googlecalendar: createCachedImport(() => import("../../googlecalendar")),
  "ics-feedcalendar": createCachedImport(() => import("../../ics-feedcalendar")),
  larkcalendar: createCachedImport(() => import("../../larkcalendar")),
  office365calendar: createCachedImport(() => import("../../office365calendar")),
  exchange2013calendar: createCachedImport(() => import("../../exchange2013calendar")),
  exchange2016calendar: createCachedImport(() => import("../../exchange2016calendar")),
  exchangecalendar: createCachedImport(() => import("../../exchangecalendar")),
  zohocalendar: createCachedImport(() => import("../../zohocalendar")),
};

export type CalendarLoaderKey = keyof typeof calendarLoaders;

export default calendarLoaders;
