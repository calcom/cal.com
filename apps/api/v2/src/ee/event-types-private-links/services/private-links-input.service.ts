import { Injectable } from "@nestjs/common";

import {
  CreatePrivateLinkInput_2024_06_14,
  UpdatePrivateLinkInput_2024_06_14,
} from "@calcom/platform-types";

@Injectable()
export class PrivateLinksInputService {
  constructor() {}

  transformCreateInput(input: CreatePrivateLinkInput_2024_06_14): CreatePrivateLinkInput_2024_06_14 {
    return {
      expiresAt: input.expiresAt,
      maxUsageCount: input.maxUsageCount,
    };
  }

  transformUpdateInput(input: UpdatePrivateLinkInput_2024_06_14): UpdatePrivateLinkInput_2024_06_14 {
    return {
      linkId: input.linkId,
      expiresAt: input.expiresAt,
      maxUsageCount: input.maxUsageCount,
    };
  }
}


