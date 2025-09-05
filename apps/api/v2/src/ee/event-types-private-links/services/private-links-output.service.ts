import {
  PrivateLinkOutput,
  TimeBasedPrivateLinkOutput,
  UsageBasedPrivateLinkOutput,
} from "@calcom/platform-types";
import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";

export type PrivateLinkData = {
  id: string;
  eventTypeId: number;
  isExpired: boolean;
  bookingUrl: string;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
  usageCount?: number;
};

@Injectable()
export class PrivateLinksOutputService {
  constructor() {}

  transformToOutput(data: PrivateLinkData): PrivateLinkOutput {
    const baseData = {
      linkId: data.id.toString(),
      eventTypeId: data.eventTypeId,
      isExpired: data.isExpired,
      bookingUrl: data.bookingUrl,
    };

    if (data.expiresAt !== null && data.expiresAt !== undefined) {
      return plainToClass(TimeBasedPrivateLinkOutput, { ...baseData, expiresAt: data.expiresAt });
    }

    return plainToClass(UsageBasedPrivateLinkOutput, {
      ...baseData,
      maxUsageCount: data.maxUsageCount || 0,
      usageCount: data.usageCount || 0,
    });
  }

  transformArrayToOutput(data: PrivateLinkData[]): PrivateLinkOutput[] {
    return data.map((item) => this.transformToOutput(item));
  }
}
