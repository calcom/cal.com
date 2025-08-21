import { AIPhoneServiceRegistry } from "./AIPhoneServiceRegistry";
import { AIPhoneServiceProviderType } from "./interfaces/AIPhoneService.interface";
import { RetellAIPhoneServiceProviderFactory } from "./providers/retellAI";

/**
 * Initialize and configure the AIPhoneServiceRegistry for application startup.
 *
 * Registers the available AI phone service providers and sets the default provider
 * (Retell AI). In non-production environments, logs the chosen default and the
 * list of available providers for debugging.
 */
export function initializeAIPhoneServiceRegistry(): void {
  const defaultProvider = AIPhoneServiceProviderType.RETELL_AI;

  // Build providers configuration - only Retell AI for now
  const providers = [
    {
      type: AIPhoneServiceProviderType.RETELL_AI,
      factory: new RetellAIPhoneServiceProviderFactory(),
    },
  ];

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
