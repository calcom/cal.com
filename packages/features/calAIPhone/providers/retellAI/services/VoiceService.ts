import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";

import type { RetellAIRepository, RetellVoice } from "../types";

export class VoiceService {
  private logger = logger.getSubLogger({ prefix: ["VoiceService"] });

  constructor(private retellRepository: RetellAIRepository) {}

  async listVoices(): Promise<RetellVoice[]> {
    try {
      const voices = await this.retellRepository.listVoices();
      
      this.logger.info("Retrieved voices successfully", {
        count: voices.length,
      });
      
      return voices;
    } catch (error) {
      this.logger.error("Failed to list voices from external AI service", {
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: "Failed to retrieve available voices. Please try again.",
      });
    }
  }
}