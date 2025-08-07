import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import {
  createPrivateLink,
  getPrivateLinks,
  updatePrivateLink,
  deletePrivateLink,
  type PrivateLinkData,
  type CreatePrivateLinkInput,
  type UpdatePrivateLinkInput,
} from "@calcom/platform-libraries/private-links";
import {
  CreatePrivateLinkInput_2024_06_14,
  UpdatePrivateLinkInput_2024_06_14,
  PrivateLinkOutput_2024_06_14,
} from "@calcom/platform-types";

@Injectable()
export class PrivateLinksService_2024_06_14 {
  constructor() {}

  /**
   * Transform platform library input to API v2 input
   */
  private transformInputToLibrary(input: CreatePrivateLinkInput_2024_06_14): CreatePrivateLinkInput {
    return {
      expiresAt: input.expiresAt,
      maxUsageCount: input.maxUsageCount,
    };
  }

  /**
   * Transform platform library output to API v2 output
   */
  private transformOutputFromLibrary(data: PrivateLinkData): PrivateLinkOutput_2024_06_14 {
    const result: PrivateLinkOutput_2024_06_14 = {
      id: data.id.toString(),
      link: data.link,
      eventTypeId: data.eventTypeId,
      isExpired: data.isExpired,
      bookingUrl: data.bookingUrl,
    };

    // Only include expiresAt if it has a value
    if (data.expiresAt !== null && data.expiresAt !== undefined) {
      result.expiresAt = data.expiresAt;
    }

    // Only include maxUsageCount and usageCount if this is not a time-based expiration link
    if (!data.expiresAt) {
      if (data.maxUsageCount !== null && data.maxUsageCount !== undefined) {
        result.maxUsageCount = data.maxUsageCount;
      }
      if (data.usageCount !== null && data.usageCount !== undefined) {
        result.usageCount = data.usageCount;
      }
    }

    return result;
  }

  async createPrivateLink(
    eventTypeId: number,
    userId: number,
    input: CreatePrivateLinkInput_2024_06_14
  ): Promise<PrivateLinkOutput_2024_06_14> {
    try {
      const libraryInput = this.transformInputToLibrary(input);
      const result = await createPrivateLink(eventTypeId, userId, libraryInput);
      return this.transformOutputFromLibrary(result);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to create private link");
    }
  }

  async getPrivateLinks(eventTypeId: number, userId: number): Promise<PrivateLinkOutput_2024_06_14[]> {
    try {
      const results = await getPrivateLinks(eventTypeId, userId);
      return results.map((result) => this.transformOutputFromLibrary(result));
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to get private links");
    }
  }

  async updatePrivateLink(
    eventTypeId: number,
    userId: number,
    input: UpdatePrivateLinkInput_2024_06_14
  ): Promise<PrivateLinkOutput_2024_06_14> {
    try {
      const libraryInput: UpdatePrivateLinkInput = {
        linkId: input.linkId,
        expiresAt: input.expiresAt,
        maxUsageCount: input.maxUsageCount,
      };
      const result = await updatePrivateLink(eventTypeId, userId, libraryInput);
      return this.transformOutputFromLibrary(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to update private link");
    }
  }

  async deletePrivateLink(eventTypeId: number, userId: number, linkId: string): Promise<void> {
    try {
      await deletePrivateLink(eventTypeId, userId, linkId);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to delete private link");
    }
  }
}
