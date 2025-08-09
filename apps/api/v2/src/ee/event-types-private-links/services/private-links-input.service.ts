import { Injectable } from "@nestjs/common";

import { CreatePrivateLinkInput, UpdatePrivateLinkInput } from "@calcom/platform-types";

@Injectable()
export class PrivateLinksInputService {
  constructor() {}

  transformCreateInput(input: CreatePrivateLinkInput): CreatePrivateLinkInput {
    return {
      expiresAt: input.expiresAt,
      maxUsageCount: input.maxUsageCount,
    };
  }

  transformUpdateInput(input: UpdatePrivateLinkInput): UpdatePrivateLinkInput {
    return {
      linkId: input.linkId,
      expiresAt: input.expiresAt,
      maxUsageCount: input.maxUsageCount,
    };
  }
}


