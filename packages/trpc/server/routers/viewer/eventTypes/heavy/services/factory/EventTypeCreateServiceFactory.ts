import type { PrismaClient } from "@calcom/prisma";

import type { EventTypeCreateService } from "../base/EventTypeCreateService";
import { PersonalEventTypeCreateService } from "../implementations/PersonalEventTypeCreateService";
import { TeamEventTypeCreateService } from "../implementations/TeamEventTypeCreateService";

export interface CreateServiceOptions {
  teamId?: number;
  schedulingType?: string;
}

/**
 * Factory for creating the appropriate event type creation service
 */
export class EventTypeCreateServiceFactory {
  /**
   * Create the appropriate service based on the context
   */
  static createService(prisma: PrismaClient, options: CreateServiceOptions): EventTypeCreateService {
    // If team ID and scheduling type are provided, it's a team event type
    if (options.teamId && options.schedulingType) {
      return new TeamEventTypeCreateService(prisma);
    }

    // Otherwise, it's a personal event type
    return new PersonalEventTypeCreateService(prisma);
  }
}
