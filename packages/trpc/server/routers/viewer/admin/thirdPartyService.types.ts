import type { ServiceName, ServiceProvider } from "@calcom/prisma/enums";

export type ThirdPartyServiceConfig = {
  id: number;
  name: ServiceName;
  defaultProvider: ServiceProvider;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ThirdPartyServiceWithStatus = {
  id: number | null;
  name: ServiceName;
  defaultProvider: ServiceProvider | null;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  isConfigured: boolean;
};

export type ServiceProviderOption = {
  value: ServiceProvider;
  label: string;
  description?: string;
  isAvailable: boolean;
};

export const SERVICE_PROVIDER_OPTIONS: Record<ServiceName, ServiceProviderOption[]> = {
  MESSAGING: [
    {
      value: "TWILIO" as ServiceProvider,
      label: "Twilio",
      description: "Industry-leading SMS and messaging platform with global coverage",
      isAvailable: true,
    },
    {
      value: "ICSMOBILE" as ServiceProvider,
      label: "ICS Mobile",
      description: "Cost-effective regional SMS messaging provider",
      isAvailable: true,
    },
  ],
  EMAIL: [
    // Will be populated when you add email providers
  ],
  PAYMENTS: [
    // Will be populated when you add payment providers
  ],
};

// Helper function to get human-readable service names
export const SERVICE_DISPLAY_NAMES: Record<ServiceName, string> = {
  MESSAGING: "SMS & Messaging",
  EMAIL: "Email Delivery",
  PAYMENTS: "Payment Processing",
};

// Helper function to get service descriptions
export const SERVICE_DESCRIPTIONS: Record<ServiceName, string> = {
  MESSAGING: "Configure your default SMS and messaging service provider",
  EMAIL: "Configure your default email delivery service provider",
  PAYMENTS: "Configure your default payment processing provider",
};
