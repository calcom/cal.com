import { Credential } from "@prisma/client";

import { CALENDAR_INTEGRATIONS_TYPES } from "../constants/generals";
import CalendarService from "./BaseCalendarService";

export default class LarkCalendarService extends CalendarService {
  constructor(credential: Credential) {
    super(credential, CALENDAR_INTEGRATIONS_TYPES.lark);
  }
}
