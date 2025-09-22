import type { z } from "zod";

import { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";
import type { PrismaClient, Prisma } from "@calcom/prisma";
import type { eventTypeLocations } from "@calcom/prisma/zod-utils";

export type EventTypeLocation = z.infer<typeof eventTypeLocations>[number];

export interface EventTypeCreateContext {
  userId: number;
  teamId?: number;
  organizationId?: number | null;
  profileId: number | null;
  prisma: PrismaClient;
  isOrgAdmin: boolean;
  userRole?: string;
}

export interface EventTypeCreateData {
  data: Prisma.EventTypeCreateInput;
  profileId: number | null;
}

/**
 * Base service for creating event types
 */
export abstract class EventTypeCreateService {
  protected prisma: PrismaClient;
  protected eventTypeRepo: EventTypeRepository;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.eventTypeRepo = new EventTypeRepository(prisma);
  }

  /**
   * Main method to create an event type
   */
  async create(context: EventTypeCreateContext, data: EventTypeCreateData) {
    // Validate permissions
    await this.validatePermissions(context);

    // Prepare the data
    const preparedData = await this.prepareData(context, data);

    // Create the event type
    return await this.createEventType(preparedData);
  }

  /**
   * Validate user permissions for creating the event type
   */
  protected abstract validatePermissions(context: EventTypeCreateContext): Promise<void>;

  /**
   * Prepare the data for event type creation
   */
  protected abstract prepareData(
    context: EventTypeCreateContext,
    data: EventTypeCreateData
  ): Promise<EventTypeCreateData>;

  /**
   * Create the event type in the database
   */
  protected async createEventType(data: EventTypeCreateData) {
    return await this.eventTypeRepo.create({
      ...data.data,
      profileId: data.profileId,
    });
  }
}
