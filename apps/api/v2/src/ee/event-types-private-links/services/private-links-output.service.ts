import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import { type PrivateLinkData } from "@calcom/platform-libraries/private-links";
import {
  PrivateLinkOutput_2024_06_14,
  TimeBasedPrivateLinkOutput_2024_06_14,
  UsageBasedPrivateLinkOutput_2024_06_14,
} from "@calcom/platform-types";

@Injectable()
export class PrivateLinksOutputService {
  constructor() {}

  transformToOutput(data: PrivateLinkData): PrivateLinkOutput_2024_06_14 {
    const baseData = {
      linkId: data.id.toString(),
      eventTypeId: data.eventTypeId,
      isExpired: data.isExpired,
      bookingUrl: data.bookingUrl,
    };

    if (data.expiresAt !== null && data.expiresAt !== undefined) {
      return plainToClass(
        TimeBasedPrivateLinkOutput_2024_06_14,
        { ...baseData, expiresAt: data.expiresAt }
      );
    }

    return plainToClass(
      UsageBasedPrivateLinkOutput_2024_06_14,
      { ...baseData, maxUsageCount: data.maxUsageCount || 0, usageCount: data.usageCount || 0 }
    );
  }

  transformArrayToOutput(data: PrivateLinkData[]): PrivateLinkOutput_2024_06_14[] {
    return data.map((item) => this.transformToOutput(item));
  }
}


