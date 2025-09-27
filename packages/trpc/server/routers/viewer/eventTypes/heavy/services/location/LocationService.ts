import type { z } from "zod";

import { getDefaultLocations } from "@calcom/app-store/_utils/getDefaultLocations";
import { DailyLocationType } from "@calcom/app-store/constants";
import type { Prisma } from "@calcom/prisma/client";
import type { eventTypeLocations } from "@calcom/prisma/zod-utils";

export type EventTypeLocation = z.infer<typeof eventTypeLocations>[number];

export interface LocationServiceUser {
  id: number;
  email: string;
  metadata: Prisma.JsonValue;
}

/**
 * Service for handling event type locations
 */
export class LocationService {
  /**
   * Process and validate locations for an event type
   */
  async processLocations(
    inputLocations: EventTypeLocation[] | undefined,
    user: LocationServiceUser
  ): Promise<{
    locations: EventTypeLocation[];
    hasCalVideo: boolean;
  }> {
    // Use provided locations or get defaults
    const locations =
      inputLocations && inputLocations.length !== 0 ? inputLocations : await getDefaultLocations(user);

    // Check if Cal.video location is active
    const hasCalVideo = this.hasCalVideoLocation(locations);

    return {
      locations,
      hasCalVideo,
    };
  }

  /**
   * Check if locations include Cal.video
   */
  private hasCalVideoLocation(locations: EventTypeLocation[]): boolean {
    return locations.some((location) => location.type === DailyLocationType);
  }

  /**
   * Validate location configuration
   */
  validateLocations(locations: EventTypeLocation[]): boolean {
    // Add any validation logic here
    // For example, check for duplicate location types, invalid configurations, etc.
    return locations.every((location) => {
      // Basic validation - ensure each location has a type
      return !!location.type;
    });
  }
}
