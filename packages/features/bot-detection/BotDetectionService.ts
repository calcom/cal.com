import type { IncomingHttpHeaders } from "node:http";
import process from "node:process";
import type { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { checkBotId } from "botid/server";

interface BotDetectionConfig {
  eventTypeId?: number;
  headers: IncomingHttpHeaders;
}

const log = logger.getSubLogger({ prefix: ["[BotDetectionService]"] });

export class BotDetectionService {
  constructor(
    private featuresRepository: FeaturesRepository,
    private eventTypeRepository: EventTypeRepository
  ) {}

  private instanceHasBotIdEnabled() {
    return process.env.NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER === "1";
  }

  async checkBotDetection(config: BotDetectionConfig): Promise<void> {
    if (!this.instanceHasBotIdEnabled()) return;

    const { eventTypeId, headers } = config;

    // If no eventTypeId provided, skip bot detection
    if (!eventTypeId) {
      return;
    }

    if (!Number.isInteger(eventTypeId) || eventTypeId <= 0) {
      throw new ErrorWithCode(
        ErrorCode.BadRequest,
        `Invalid eventTypeId: ${eventTypeId}. Must be a positive integer.`
      );
    }

    // Fetch only the teamId from the event type
    const eventType = await this.eventTypeRepository.getTeamIdByEventTypeId({
      id: eventTypeId,
    });

    // Only check for team events
    if (!eventType?.teamId) {
      return;
    }

    // Check if BotID feature is enabled for this team (also checks global scope - enabling on all teams)
    const isBotIDEnabled = await this.featuresRepository.checkIfTeamHasFeature(
      eventType.teamId,
      "booker-botid"
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
    };

    if (verification.isBot) {
      log.warn("Bot detected - blocking request", verificationDetails);
      throw new HttpError({ statusCode: 403, message: "Access denied" });
    }
  }
}
