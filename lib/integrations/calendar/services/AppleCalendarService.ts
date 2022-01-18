import { Credential } from "@prisma/client";

import { APPLE_CALENDAR_URL, CALENDAR_INTEGRATIONS_TYPES } from "../constants/generals";
import CalendarService from "./BaseCalendarService";

export default class AppleCalendarService extends CalendarService {
  constructor(credential: Credential) {
    super(credential, CALENDAR_INTEGRATIONS_TYPES.apple, APPLE_CALENDAR_URL);
  }
}
