import logger from "@calcom/lib/logger";

import type {
  AIPhoneServiceProvider,
  AIPhoneServiceProviderFactory,
  AIPhoneServiceProviderConfig,
} from "../../interfaces/ai-phone-service.interface";
import { RetellSDKClient } from "./client";
import { RetellAIProvider } from "./provider";

export class RetellAIProviderFactory implements AIPhoneServiceProviderFactory {
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider {
    const log =
      config.enableLogging !== false ? logger.getSubLogger({ prefix: ["retellAIProvider:"] }) : undefined;

    const sdkClient = new RetellSDKClient(log);
    return new RetellAIProvider(sdkClient);
  }

  static createWithConfig(config?: {
    enableLogging?: boolean;
    logger?: ReturnType<typeof logger.getSubLogger>;
  }): AIPhoneServiceProvider {
    const enableLogging = config?.enableLogging ?? true;
    const log = enableLogging
      ? config?.logger || logger.getSubLogger({ prefix: ["retellAIProvider:"] })
      : undefined;

    const sdkClient = new RetellSDKClient(log);
    return new RetellAIProvider(sdkClient);
  }
}
