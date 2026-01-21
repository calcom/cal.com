import logger from "@calcom/lib/logger";

import type {
  AIPhoneServiceProvider,
  AIPhoneServiceProviderFactory,
  AIPhoneServiceProviderConfig,
  AIPhoneServiceProviderType,
} from "../../interfaces/AIPhoneService.interface";
import { PrismaAgentRepositoryAdapter } from "../adapters/PrismaAgentRepositoryAdapter";
import { PrismaPhoneNumberRepositoryAdapter } from "../adapters/PrismaPhoneNumberRepositoryAdapter";
import { PrismaTransactionAdapter } from "../adapters/PrismaTransactionAdapter";
import { RetellAIPhoneServiceProvider } from "./RetellAIPhoneServiceProvider";
import { RetellSDKClient } from "./RetellSDKClient";

export class RetellAIPhoneServiceProviderFactory
  implements AIPhoneServiceProviderFactory<AIPhoneServiceProviderType.RETELL_AI>
{
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider<AIPhoneServiceProviderType.RETELL_AI> {
    const log =
      config.enableLogging !== false
        ? logger.getSubLogger({ prefix: ["RetellAIPhoneServiceProvider:"] })
        : undefined;

    const sdkClient = new RetellSDKClient(log);
    const agentRepository = new PrismaAgentRepositoryAdapter();
    const phoneNumberRepository = new PrismaPhoneNumberRepositoryAdapter();
    const transactionManager = new PrismaTransactionAdapter();

    return new RetellAIPhoneServiceProvider(
      sdkClient,
      agentRepository,
      phoneNumberRepository,
      transactionManager
    );
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
    const agentRepository = new PrismaAgentRepositoryAdapter();
    const phoneNumberRepository = new PrismaPhoneNumberRepositoryAdapter();
    const transactionManager = new PrismaTransactionAdapter();

    return new RetellAIPhoneServiceProvider(
      sdkClient,
      agentRepository,
      phoneNumberRepository,
      transactionManager
    );
  }
}
