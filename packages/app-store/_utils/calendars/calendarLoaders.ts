import { createCachedImport } from "../createCachedImport";

const calendarLoaders = {
  applecalendar: createCachedImport(() => import("../../applecalendar/lib")),
  caldavcalendar: createCachedImport(() => import("../../caldavcalendar/lib")),
  googlecalendar: createCachedImport(() => import("../../googlecalendar/lib")),
  "ics-feedcalendar": createCachedImport(() => import("../../ics-feedcalendar/lib")),
  larkcalendar: createCachedImport(() => import("../../larkcalendar/lib")),
  office365calendar: createCachedImport(() => import("../../office365calendar/lib")),
  exchange2013calendar: createCachedImport(() => import("../../exchange2013calendar/lib")),
  exchange2016calendar: createCachedImport(() => import("../../exchange2016calendar/lib")),
  exchangecalendar: createCachedImport(() => import("../../exchangecalendar/lib")),
  zohocalendar: createCachedImport(() => import("../../zohocalendar/lib")),
};

export type CalendarLoaderKey = keyof typeof calendarLoaders;

export default calendarLoaders;
