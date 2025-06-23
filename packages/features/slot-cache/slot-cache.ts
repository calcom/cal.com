import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { SlotCacheRepository } from "./slot-cache.repository";

export class SlotCache {
  static async init(): Promise<SlotCacheRepository | null> {
    const featureRepo = new FeaturesRepository();
    const isSlotCacheEnabled = await featureRepo.checkIfFeatureIsEnabledGlobally("slot-cache");

    if (isSlotCacheEnabled) {
      return new SlotCacheRepository();
    }

    return null;
  }
}
