import { checkBotId } from "botid/server";
import type { IncomingHttpHeaders } from "http";

import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";

interface BotDetectionConfig {
  eventTypeId?: number;
  headers: IncomingHttpHeaders;
}

const log = logger.getSubLogger({ prefix: ["[BotDetectionService]"] });

export class BotDetectionService {
  constructor(private prisma: PrismaClient, private featuresRepository: FeaturesRepository) {}

  async checkBotDetection(config: BotDetectionConfig): Promise<void> {
    const { eventTypeId, headers } = config;

    // If no eventTypeId provided, skip bot detection
    if (!eventTypeId) {
      return;
    }

    // Fetch only the teamId from the event type
    const eventType = await this.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { teamId: true, slug: true },
    });

    // Only check for team events
    if (!eventType?.teamId) {
      return;
    }

    // Check if BotID feature is enabled for this team (also checks global scope - enabling on all teams)
    const isBotIDEnabled = await this.featuresRepository.checkIfTeamHasFeature(
      eventType.teamId,
      "booker-botID"
    );

    if (!isBotIDEnabled) {
      return;
    }

    // Perform bot detection
    const verification = await checkBotId({
      advancedOptions: {
        headers,
      },
    });

    // Log verification results with detailed information
    const verificationDetails = {
      isBot: verification.isBot,
      isHuman: verification.isHuman,
      isVerifiedBot: verification.isVerifiedBot,
      verifiedBotName: verification.verifiedBotName,
      verifiedBotCategory: verification.verifiedBotCategory,
      bypassed: verification.bypassed,
      classificationReason: verification.classificationReason,
      teamId: eventType.teamId,
      eventTypeId,
      eventTypeSlug: eventType.slug,
    };

    if (verification.isBot) {
      log.warn("Bot detected - blocking request", verificationDetails);
      throw new HttpError({ statusCode: 403, message: "Access denied" });
    }
  }
}
