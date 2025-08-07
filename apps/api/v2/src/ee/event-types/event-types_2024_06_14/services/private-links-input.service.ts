import { Injectable } from "@nestjs/common";

import {
  CreatePrivateLinkInput_2024_06_14,
  UpdatePrivateLinkInput_2024_06_14,
} from "@calcom/platform-types";

@Injectable()
export class PrivateLinksInputService_2024_06_14 {
  constructor() {}

  /**
   * Transform API v2 input to platform library internal format
   * Currently inputs are compatible, but this service allows for future transformations
   */
  transformCreateInput(input: CreatePrivateLinkInput_2024_06_14): CreatePrivateLinkInput_2024_06_14 {
    // Currently no transformation needed, but this allows for future changes
    return {
      expiresAt: input.expiresAt,
      maxUsageCount: input.maxUsageCount,
    };
  }

  /**
   * Transform API v2 update input to platform library internal format
   */
  transformUpdateInput(input: UpdatePrivateLinkInput_2024_06_14): UpdatePrivateLinkInput_2024_06_14 {
    // Currently no transformation needed, but this allows for future changes
    return {
      linkId: input.linkId,
      expiresAt: input.expiresAt,
      maxUsageCount: input.maxUsageCount,
    };
  }
}
