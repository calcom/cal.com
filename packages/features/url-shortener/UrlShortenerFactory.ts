import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import { getUserFeatureRepository } from "@calcom/features/di/containers/UserFeatureRepository";
import type { IUrlShortenerProvider } from "./IUrlShortenerProvider";
import { DubShortener } from "./providers/DubShortener";
import { NoopShortener } from "./providers/NoopShortener";
import { SinkClient } from "./providers/SinkClient";
import { SinkShortener } from "./providers/SinkShortener";

export class UrlShortenerFactory {
  static async create({
    userId,
    teamId,
  }: {
    userId?: number | null;
    teamId?: number | null;
  } = {}): Promise<IUrlShortenerProvider> {
    if (SinkShortener.isConfigured()) {
      const featureRepository = getFeatureRepository();

      const globallyEnabled = await featureRepository.checkIfFeatureIsEnabledGlobally("sink-shortener");
      if (globallyEnabled) {
        return new SinkShortener(new SinkClient());
      }

      if (userId) {
        const userFeatureRepository = getUserFeatureRepository();
        const useSink = await userFeatureRepository.checkIfUserHasFeature(userId, "sink-shortener");
        if (useSink) {
          return new SinkShortener(new SinkClient());
        }
      }

      if (teamId) {
        const teamFeatureRepository = getTeamFeatureRepository();
        const useSink = await teamFeatureRepository.checkIfTeamHasFeature(teamId, "sink-shortener");
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
