import logger from "@calcom/lib/logger";
import { fetcher } from "@calcom/lib/retellAIFetcher";

import { RetellAIApiClient } from "./client";
import { RetellAIService } from "./service";

export class RetellAIServiceFactory {
  static create(): RetellAIService {
    const log = logger.getSubLogger({ prefix: ["retellAIService:"] });
    const apiClient = new RetellAIApiClient(fetcher, log);
    return new RetellAIService(apiClient);
  }

  static createWithConfig(config: {
    enableLogging?: boolean;
    httpClient?: typeof fetcher;
    logger?: ReturnType<typeof logger.getSubLogger>;
  }): RetellAIService {
    const enableLogging = config.enableLogging ?? true;
    const log = enableLogging
      ? config.logger || logger.getSubLogger({ prefix: ["retellAIService:"] })
      : undefined;
    const apiClient = new RetellAIApiClient(config.httpClient || fetcher, log);
    return new RetellAIService(apiClient);
  }
}
