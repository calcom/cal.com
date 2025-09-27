import type { Prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import type { EventTypeLocation } from "../location/LocationService";
import type { CalVideoSettings } from "../video/CalVideoSettingsService";
import { CalVideoSettingsService } from "../video/CalVideoSettingsService";

export interface EventTypeDataBuilderOptions {
  // Core event type data
  title?: string;
  slug?: string;
  description?: string;
  length?: number;
  hidden?: boolean;
  position?: number;
  price?: number;
  currency?: string;
  slotInterval?: number;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  recurringEvent?: Prisma.InputJsonValue;
  seatsPerTimeSlot?: number;
  seatsShowAttendees?: boolean;
  seatsShowAvailabilityCount?: boolean;

  // Relationships
  userId: number;
  teamId?: number;
  scheduleId?: number;

  // Scheduling
  schedulingType?: SchedulingType;

  // Locations and settings
  locations: EventTypeLocation[];
  metadata?: Prisma.InputJsonObject;
  calVideoSettings?: CalVideoSettings;
  hasCalVideoLocation: boolean;
}

/**
 * Builder service for constructing event type data
 */
export class EventTypeDataBuilder {
  private calVideoSettingsService: CalVideoSettingsService;

  constructor() {
    this.calVideoSettingsService = new CalVideoSettingsService();
  }

  /**
   * Build the Prisma data object for event type creation
   */
  buildCreateData(options: EventTypeDataBuilderOptions): Prisma.EventTypeCreateInput {
    const {
      userId,
      teamId,
      scheduleId,
      schedulingType,
      locations,
      metadata,
      calVideoSettings,
      hasCalVideoLocation,
      ...eventTypeFields
    } = options;

    const isManagedEventType = schedulingType === SchedulingType.MANAGED;

    const data: Prisma.EventTypeCreateInput = {
      ...eventTypeFields,
      locations,
      metadata: metadata ?? undefined,

      // Owner connection - only for personal event types
      owner: teamId ? undefined : { connect: { id: userId } },

      // User connection - only for non-managed and non-team event types
      users: isManagedEventType || schedulingType ? undefined : { connect: { id: userId } },

      // Schedule connection
      schedule: scheduleId ? { connect: { id: scheduleId } } : undefined,
    };

    // Add team connection if needed
    if (teamId && schedulingType) {
      data.team = {
        connect: {
          id: teamId,
        },
      };
      data.schedulingType = schedulingType;
    }

    // Add Cal.video settings if applicable
    if (hasCalVideoLocation && calVideoSettings) {
      data.calVideoSettings = this.calVideoSettingsService.createCalVideoSettings(calVideoSettings);
    }

    return data;
  }

  /**
   * Validate the event type data before creation
   */
  validateData(data: Prisma.EventTypeCreateInput): boolean {
    // Add validation logic here
    // Check required fields, validate relationships, etc.

    // Example validations:
    if (!data.title || data.title.length === 0) {
      return false;
    }

    if (!data.slug || data.slug.length === 0) {
      return false;
    }

    if (data.length && data.length <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Apply default values to event type data
   */
  applyDefaults(data: Partial<EventTypeDataBuilderOptions>): EventTypeDataBuilderOptions {
    return {
      title: data.title || "Untitled Event",
      slug: data.slug || "untitled",
      description: data.description || "",
      length: data.length || 30,
      hidden: data.hidden ?? false,
      position: data.position ?? 0,
      locations: data.locations || [],
      hasCalVideoLocation: data.hasCalVideoLocation ?? false,
      userId: data.userId!,
      ...data,
    } as EventTypeDataBuilderOptions;
  }
}
