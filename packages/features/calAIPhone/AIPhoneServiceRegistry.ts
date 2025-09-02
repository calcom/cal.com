import { ensureAIPhoneServiceRegistryInitialized } from "./initializeRegistry";
import { AIPhoneServiceProviderType } from "./interfaces/AIPhoneService.interface";
import type {
  AIPhoneServiceProvider,
  AIPhoneServiceProviderFactory,
  AIPhoneServiceProviderConfig,
} from "./interfaces/AIPhoneService.interface";

/**
 * Configuration for the registry
 */
interface RegistryConfiguration {
  defaultProvider?: string;
  providers?: Array<{
    type: string;
    factory: AIPhoneServiceProviderFactory;
  }>;
}

/**
 * Registry for AI phone service providers
 * Allows registering and creating different AI service providers
 */
export class AIPhoneServiceRegistry {
  private static factories: Map<string, AIPhoneServiceProviderFactory> = new Map();
  private static defaultProvider: string = AIPhoneServiceProviderType.RETELL_AI;
  private static initialized = false;

  /**
   * Initialize the registry with configuration
   * This should be called during application startup
   */
  static initialize(config?: RegistryConfiguration): void {
    // Register providers if provided
    if (config?.providers) {
      config.providers.forEach(({ type, factory }) => {
        this.registerProvider(type, factory);
      });
    }

    // Set default provider if provided, otherwise use the first registered provider
    if (config?.defaultProvider) {
      this.setDefaultProvider(config.defaultProvider);
    } else if (this.factories.size > 0) {
      this.defaultProvider = Array.from(this.factories.keys())[0];
    }

    this.initialized = true;
  }

  static registerProvider(type: string, factory: AIPhoneServiceProviderFactory): void {
    this.factories.set(type, factory);

    // If no default provider is set and this is the first provider, make it default
    if (!this.defaultProvider) {
      this.defaultProvider = type;
    }
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
    if (!this.defaultProvider) {
      throw new Error(
        "No default provider set. Please initialize the registry with a default provider or register at least one provider."
      );
    }
    return this.createProvider(AIPhoneServiceRegistry.defaultProvider, config);
  }

  static setDefaultProvider(type: string): void {
    if (!this.factories.has(type)) {
      throw new Error(`Cannot set default provider to '${type}' - provider not registered`);
    }
    this.defaultProvider = type;
  }

  static getDefaultProvider(): string | null {
    return AIPhoneServiceRegistry.defaultProvider;
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.factories.keys());
  }

  static isProviderRegistered(type: string): boolean {
    return this.factories.has(type);
  }

  /**
   * Clear all registered providers (mainly for testing purposes)
   */
  static clearProviders(): void {
    this.factories.clear();
    this.defaultProvider = AIPhoneServiceProviderType.RETELL_AI;
    this.initialized = false;
  }

  static isInitialized(): boolean {
    return AIPhoneServiceRegistry.initialized;
  }
}

/**
 * Provider-specific API key resolution
 * This function determines the appropriate API key based on the provider type
 */
function resolveApiKey(providerType: string, config?: Partial<AIPhoneServiceProviderConfig>): string {
  // First check if API key is provided in config
  if (config?.apiKey) {
    return config.apiKey;
  }

  // Then check environment variables based on provider type
  const envVarMap: Record<string, string | undefined> = {
    [AIPhoneServiceProviderType.RETELL_AI]: process.env.RETELL_AI_KEY,
    // Add more providers here as they are implemented
  };

  const apiKey = envVarMap[providerType];

  if (!apiKey) {
    throw new Error(
      `API key not configured for provider type: ${providerType}. ` +
        `Please set the API key in the config or provide the appropriate environment variable.`
    );
  }

  return apiKey;
}

/**
 * Options for creating an AI phone service provider
 */
interface CreateProviderOptions {
  /** Provider type to use. If not specified, uses the default provider */
  providerType?: string;
  /** Configuration options for the provider */
  config?: Partial<AIPhoneServiceProviderConfig>;
}

export function createAIPhoneServiceProvider(options: CreateProviderOptions = {}): AIPhoneServiceProvider {
  // Ensure the registry is initialized before creating a provider
  ensureAIPhoneServiceRegistryInitialized();

  const { providerType, config } = options;

  // Use provided type or fall back to default provider
  const type = providerType || AIPhoneServiceRegistry.getDefaultProvider();
  if (!type) {
    throw new Error("No provider type specified and no default provider configured");
  }

  const apiKey = resolveApiKey(type, config);

  const providerConfig: AIPhoneServiceProviderConfig = {
    apiKey,
    enableLogging: process.env.NODE_ENV !== "production",
    ...config,
  };

  return AIPhoneServiceRegistry.createProvider(type, providerConfig);
}

export function createDefaultAIPhoneServiceProvider(
  config?: Partial<AIPhoneServiceProviderConfig>
): AIPhoneServiceProvider {
  return createAIPhoneServiceProvider({ config });
}
