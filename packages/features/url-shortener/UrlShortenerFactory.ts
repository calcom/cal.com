import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import prisma from "@calcom/prisma";

import type { IUrlShortenerProvider } from "./IUrlShortenerProvider";
import { DubShortener } from "./providers/DubShortener";
import { NoopShortener } from "./providers/NoopShortener";
import { SinkClient } from "./providers/SinkClient";
import { SinkShortener } from "./providers/SinkShortener";

export class UrlShortenerFactory {
  static async create({
    userId,
    teamId,
  }: { userId?: number | null; teamId?: number | null } = {}): Promise<IUrlShortenerProvider> {
    if (SinkShortener.isConfigured()) {
      const featuresRepository = new FeaturesRepository(prisma);

      const globallyEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("sink-shortener");
      if (globallyEnabled) {
        return new SinkShortener(new SinkClient());
      }

      if (userId) {
        const useSink = await featuresRepository.checkIfUserHasFeature(userId, "sink-shortener");
        if (useSink) {
          return new SinkShortener(new SinkClient());
        }
      }

      if (teamId) {
        const useSink = await featuresRepository.checkIfTeamHasFeature(teamId, "sink-shortener");
        if (useSink) {
          return new SinkShortener(new SinkClient());
        }
      }
    }

    if (DubShortener.isConfigured()) {
      return new DubShortener();
    }
    return new NoopShortener();
  }
}
