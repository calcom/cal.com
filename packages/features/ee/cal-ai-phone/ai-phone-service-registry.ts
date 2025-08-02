import { RETELL_API_KEY } from "@calcom/lib/constants";

import { AIPhoneServiceProviderType } from "./interfaces/ai-phone-service.interface";
import type {
  AIPhoneServiceProvider,
  AIPhoneServiceProviderFactory,
  AIPhoneServiceProviderConfig,
} from "./interfaces/ai-phone-service.interface";
import { RetellAIProviderFactory } from "./providers/retell-ai";

/**
 * Registry for AI phone service providers
 * Allows registering and creating different AI service providers
 */
export class AIPhoneServiceRegistry {
  private static factories: Map<string, AIPhoneServiceProviderFactory> = new Map();
  private static defaultProvider: string = AIPhoneServiceProviderType.RETELL_AI;

  static registerProvider(type: string, factory: AIPhoneServiceProviderFactory): void {
    this.factories.set(type, factory);
  }

  static getProviderFactory(type: string): AIPhoneServiceProviderFactory | undefined {
    return this.factories.get(type);
  }

  static createProvider(type: string, config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider {
    const factory = this.getProviderFactory(type);
    if (!factory) {
      throw new Error(
        `AI phone service provider '${type}' not found. Available providers: ${Array.from(
          this.factories.keys()
        ).join(", ")}`
      );
    }
    return factory.create(config);
  }

  /**
   * Create a provider instance using the default provider
   */
  static createDefaultProvider(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider {
    return this.createProvider(AIPhoneServiceRegistry.defaultProvider, config);
  }

  static setDefaultProvider(type: string): void {
    if (!this.factories.has(type)) {
      throw new Error(`Cannot set default provider to '${type}' - provider not registered`);
    }
    this.defaultProvider = type;
  }

  static getDefaultProvider(): string {
    return AIPhoneServiceRegistry.defaultProvider;
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.factories.keys());
  }

  static isProviderRegistered(type: string): boolean {
    return this.factories.has(type);
  }
}

AIPhoneServiceRegistry.registerProvider(AIPhoneServiceProviderType.RETELL_AI, new RetellAIProviderFactory());

export function createAIPhoneServiceProvider(
  providerType?: string,
  config?: Partial<AIPhoneServiceProviderConfig>
): AIPhoneServiceProvider {
  const type = providerType || AIPhoneServiceProviderType.RETELL_AI;

  const providerConfig: AIPhoneServiceProviderConfig = {
    apiKey: RETELL_API_KEY || "",
    enableLogging: process.env.NODE_ENV !== "production",
    ...config,
  };

  return AIPhoneServiceRegistry.createProvider(type, providerConfig);
}

export function createDefaultAIPhoneServiceProvider(
  config?: Partial<AIPhoneServiceProviderConfig>
): AIPhoneServiceProvider {
  return createAIPhoneServiceProvider(undefined, config);
}
