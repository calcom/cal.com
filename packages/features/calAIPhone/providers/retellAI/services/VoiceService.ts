import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";

import type { RetellAIRepository, RetellVoice } from "../types";

type Dependencies = {
  retellRepository: RetellAIRepository;
};

export class VoiceService {
  private logger = logger.getSubLogger({ prefix: ["VoiceService"] });
  constructor(private deps: Dependencies) {}

  async listVoices(): Promise<RetellVoice[]> {
    try {
      const voices = await this.deps.retellRepository.listVoices();

      this.logger.info("Retrieved voices successfully", {
        count: voices.length,
      });

      return voices;
    } catch (error) {
      this.logger.error("Failed to list voices from external AI service", {
        error,
      });
      throw new ErrorWithCode(ErrorCode.InternalServerError, "Failed to retrieve available voices. Please try again.");
    }
  }
}
