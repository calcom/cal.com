import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";

export const DEFAULT_CALENDARS_JOB = "default_calendars_job";
export const CALENDARS_QUEUE = "calendars";
export type DefaultCalendarsJobDataType = {
  userId: number;
};

@Processor(CALENDARS_QUEUE)
export class CalendarsProcessor {
  private readonly logger = new Logger(CalendarsProcessor.name);

  constructor(public readonly calendarsService: CalendarsService) {}

  @Process(DEFAULT_CALENDARS_JOB)
  async handleEnsureDefaultCalendars(job: Job<DefaultCalendarsJobDataType>) {
    const { userId } = job.data;
    try {
      // getCalendars calls getConnectedDestinationCalendarsAndEnsureDefaultsInDb from platform libraries
      // which gets the calendars from third party providers and ensure default destination and selected calendars are set in DB
      await this.calendarsService.getCalendars(userId, true);
    } catch (err) {
      this.logger.error(`Failed to load default calendars of user with id: ${userId}`, {
        userId,
        err,
      });
    }
    return;
  }
}
