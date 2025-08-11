import { Injectable } from "@nestjs/common";

import { CreatePrivateLinkInput, UpdatePrivateLinkInput } from "@calcom/platform-types";

@Injectable()
export class PrivateLinksInputService {
  constructor() {}

  transformCreateInput(input: CreatePrivateLinkInput): CreatePrivateLinkInput {
    const hasExpires = input.expiresAt !== undefined && input.expiresAt !== null;
    const hasMaxCount = typeof input.maxUsageCount === "number";

    if (!hasExpires && !hasMaxCount) {
      throw new Error("Either expiresAt or maxUsageCount must be provided");
    }

    if (hasExpires && hasMaxCount) {
      throw new Error("Provide only one of expiresAt or maxUsageCount");
    }

    return {
      expiresAt: input.expiresAt,
      maxUsageCount: input.maxUsageCount ?? (hasMaxCount ? input.maxUsageCount : undefined),
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
