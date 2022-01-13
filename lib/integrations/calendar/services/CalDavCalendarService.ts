import { InstalledApp } from "@prisma/client";

import { CALENDAR_INTEGRATIONS_TYPES } from "../constants/generals";
import CalendarService from "./BaseCalendarService";

export default class CalDavCalendarService extends CalendarService {
  constructor(installedApp: InstalledApp) {
    super(installedApp, CALENDAR_INTEGRATIONS_TYPES.caldav);
  }
}
