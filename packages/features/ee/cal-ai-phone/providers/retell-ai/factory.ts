import logger from "@calcom/lib/logger";
import { fetcher } from "@calcom/lib/retellAIFetcher";

import type {
  AIPhoneServiceProvider,
  AIPhoneServiceProviderFactory,
  AIPhoneServiceProviderConfig,
} from "../../interfaces/ai-phone-service.interface";
import { RetellAIApiClient } from "./client";
import { RetellAIProvider } from "./provider";

export class RetellAIProviderFactory implements AIPhoneServiceProviderFactory {
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider {
    const log =
      config.enableLogging !== false ? logger.getSubLogger({ prefix: ["retellAIProvider:"] }) : undefined;

    const apiClient = new RetellAIApiClient(fetcher, log);
    return new RetellAIProvider(apiClient);
  }

  static createWithConfig(config: {
    enableLogging?: boolean;
    httpClient?: typeof fetcher;
    logger?: ReturnType<typeof logger.getSubLogger>;
  }): AIPhoneServiceProvider {
    const enableLogging = config.enableLogging ?? true;
    const log = enableLogging
      ? config.logger || logger.getSubLogger({ prefix: ["retellAIProvider:"] })
      : undefined;
    const apiClient = new RetellAIApiClient(config.httpClient || fetcher, log);
    return new RetellAIProvider(apiClient);
  }
}
