import { Credential } from "@prisma/client";

import { PartialReference } from "@lib/events/EventManager";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import { DEFAULT_VIDEO_CONFERENCING_INTEGRATION_NAME } from "@lib/integrations/videoConferencing/constants/defaults";
import {
  VideoCallData,
  VideoConferencing,
} from "@lib/integrations/videoConferencing/interfaces/VideoConferencing";
import logger from "@lib/logger";

export default abstract class BaseVideoConferencingService implements VideoConferencing {
  protected integrationName = DEFAULT_VIDEO_CONFERENCING_INTEGRATION_NAME;

  log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });

  constructor(credential: Credential, integrationName: string) {
    this.integrationName = integrationName;
  }
  createMeeting(event: CalendarEvent): Promise<VideoCallData> {
    this.log.info(`creating meeting with ${JSON.stringify(event)}`);

    throw new Error("Method not implemented.");
  }
  updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> {
    this.log.info(
      `updating meeting with bookingRef ${JSON.stringify(bookingRef)} and event ${JSON.stringify(event)}`
    );

    throw new Error("Method not implemented.");
  }
  deleteMeeting(uid: string): Promise<unknown> {
    this.log.info(`deleting meeting with uid ${uid}`);

    throw new Error("Method not implemented.");
  }
  getAvailability(dateFrom?: string, dateTo?: string): Promise<{ start: Date; end: Date }[]> {
    this.log.info(`get meeting availability between ${dateFrom} and ${dateTo}`);

    throw new Error("Method not implemented.");
  }
}
