import { AIPhoneServiceRegistry } from "./AIPhoneServiceRegistry";
import { AIPhoneServiceProviderType } from "./interfaces/ai-phone-service.interface";
import { RetellAIPhoneServiceProviderFactory } from "./providers/retellAI";

/**
 * Initialize the AI Phone Service Registry
 * This function should be called during application startup
 * 
 * The configuration can be customized based on environment variables or
 * application configuration to support different deployment scenarios
 */
export function initializeAIPhoneServiceRegistry(): void {
  // Determine default provider from environment or use a sensible default
  const defaultProvider = process.env.DEFAULT_AI_PHONE_PROVIDER || AIPhoneServiceProviderType.RETELL_AI;

  // Get enabled providers from environment (comma-separated list)
  // Example: ENABLED_AI_PHONE_PROVIDERS=retellAI,twilioAI,vonageAI
  const enabledProvidersEnv = process.env.ENABLED_AI_PHONE_PROVIDERS;
  const enabledProviders = enabledProvidersEnv 
    ? enabledProvidersEnv.split(',').map(p => p.trim())
    : [AIPhoneServiceProviderType.RETELL_AI]; // Default to RetellAI if not specified

  // Build providers configuration
  const providers = [];

  // Only register providers that are explicitly enabled
  if (enabledProviders.includes(AIPhoneServiceProviderType.RETELL_AI)) {
    providers.push({
      type: AIPhoneServiceProviderType.RETELL_AI,
      factory: new RetellAIPhoneServiceProviderFactory(),
    });
  }

  // Add more providers here as they are implemented
  // if (enabledProviders.includes(AIPhoneServiceProviderType.TWILIO_AI)) {
  //   providers.push({
  //     type: AIPhoneServiceProviderType.TWILIO_AI,
  //     factory: new TwilioAIProviderFactory(),
  //   });
  // }

  // Initialize the registry
  AIPhoneServiceRegistry.initialize({
    defaultProvider,
    providers,
  });

  // Log initialization details in development
  if (process.env.NODE_ENV !== "production") {
    console.log("AI Phone Service Registry initialized:", {
      defaultProvider: AIPhoneServiceRegistry.getDefaultProvider(),
      availableProviders: AIPhoneServiceRegistry.getAvailableProviders(),
    });
  }
}

/**
 * Check if the registry needs initialization and initialize if needed
 * This is useful for ensuring the registry is ready before use
 */
export function ensureAIPhoneServiceRegistryInitialized(): void {
  if (!AIPhoneServiceRegistry.isInitialized()) {
    initializeAIPhoneServiceRegistry();
  }
}