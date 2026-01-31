import type logger from "@calcom/lib/logger";
import type { EventResult } from "@calcom/types/EventManager";

interface Dependencies {
  logger: typeof logger;
}

export class EventResultService {
  constructor(private readonly deps: Dependencies) {}

  isCalendarEventResult(result: EventResult<unknown>): boolean {
    return result.type.includes("_calendar");
  }

  filterCalendarEventResults(results: EventResult<unknown>[]): EventResult<unknown>[] {
    const filtered = results.filter((result) => this.isCalendarEventResult(result));
    return filtered;
  }

  extractSuccessfulCalendarResults(results: EventResult<unknown>[]): EventResult<unknown>[] {
    const successful = results.filter((result) => this.isCalendarEventResult(result) && result.success);
    return successful;
  }
}
