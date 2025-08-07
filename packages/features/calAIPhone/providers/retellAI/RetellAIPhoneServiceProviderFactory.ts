import logger from "@calcom/lib/logger";

import type {
  AIPhoneServiceProvider,
  AIPhoneServiceProviderFactory,
  AIPhoneServiceProviderConfig,
  AIPhoneServiceProviderType,
} from "../../interfaces/ai-phone-service.interface";
import { RetellSDKClient } from "./RetellSDKClient";
import { RetellAIPhoneServiceProvider } from "./RetellAIPhoneServiceProvider";

export class RetellAIPhoneServiceProviderFactory implements AIPhoneServiceProviderFactory<AIPhoneServiceProviderType.RETELL_AI> {
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider<AIPhoneServiceProviderType.RETELL_AI> {
    const log =
      config.enableLogging !== false ? logger.getSubLogger({ prefix: ["RetellAIPhoneServiceProvider:"] }) : undefined;

    const sdkClient = new RetellSDKClient(log);
    return new RetellAIPhoneServiceProvider(sdkClient);
  }

  static createWithConfig(config?: {
    enableLogging?: boolean;
    logger?: ReturnType<typeof logger.getSubLogger>;
  }): AIPhoneServiceProvider<AIPhoneServiceProviderType.RETELL_AI> {
    const enableLogging = config?.enableLogging ?? true;
    const log = enableLogging
      ? config?.logger || logger.getSubLogger({ prefix: ["RetellAIPhoneServiceProvider:"] })
      : undefined;

    const sdkClient = new RetellSDKClient(log);
    return new RetellAIPhoneServiceProvider(sdkClient);
  }
}
