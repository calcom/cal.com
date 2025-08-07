import { Injectable } from "@nestjs/common";

import { type PrivateLinkData } from "@calcom/platform-libraries/private-links";
import {
  PrivateLinkOutput_2024_06_14,
  TimeBasedPrivateLinkOutput_2024_06_14,
  UsageBasedPrivateLinkOutput_2024_06_14,
} from "@calcom/platform-types";

@Injectable()
export class PrivateLinksOutputService_2024_06_14 {
  constructor() {}

  /**
   * Transform platform library internal data to API v2 output
   */
  transformToOutput(data: PrivateLinkData): PrivateLinkOutput_2024_06_14 {
    const baseData = {
      linkId: data.id.toString(),
      link: data.link,
      eventTypeId: data.eventTypeId,
      isExpired: data.isExpired,
      bookingUrl: data.bookingUrl,
    };

    // Return time-based link if expiresAt is set
    if (data.expiresAt !== null && data.expiresAt !== undefined) {
      return {
        ...baseData,
        expiresAt: data.expiresAt,
      } as TimeBasedPrivateLinkOutput_2024_06_14;
    }

    // Return usage-based link if maxUsageCount is set
    return {
      ...baseData,
      maxUsageCount: data.maxUsageCount || 0,
      usageCount: data.usageCount || 0,
    } as UsageBasedPrivateLinkOutput_2024_06_14;
  }

  /**
   * Transform array of platform library internal data to API v2 outputs
   */
  transformArrayToOutput(data: PrivateLinkData[]): PrivateLinkOutput_2024_06_14[] {
    return data.map((item) => this.transformToOutput(item));
  }
}
