"use client";

import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";

import { ServiceProviderSelector } from "./components/ServiceProviderSelector";

export const ThirdPartyServiceList = () => {
  const [data] = trpc.viewer.thirdPartyService.getAllServices.useSuspenseQuery();
  const utils = trpc.useUtils();

  const handleProviderUpdate = () => {
    // Invalidate queries to refresh the list
    utils.viewer.thirdPartyService.getAllServices.invalidate();
    utils.viewer.thirdPartyService.getServiceProvider.invalidate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-emphasis text-base font-semibold leading-5">Third-Party Service Providers</h2>
        <p className="text-default mt-1 text-sm">
          Configure default service providers for different features across your application.
        </p>
      </div>

      {/* Configuration Status Card */}
      <div className="bg-muted rounded-md p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-emphasis text-sm font-medium">Configuration Status</p>
            <p className="text-muted text-xs">Overview of your service provider settings</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-emphasis text-2xl font-bold">{data.configuredServices}</p>
              <p className="text-muted text-xs">Configured</p>
            </div>
            <div className="text-center">
              <p className="text-muted text-2xl font-bold">{data.unconfiguredServices}</p>
              <p className="text-muted text-xs">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="border-subtle divide-subtle divide-y rounded-lg border">
        {data.services.map((service, index) => (
          <div
            key={service.name}
            className={`bg-default flex items-center justify-between p-4 ${
              index === 0 ? "rounded-t-lg" : ""
            } ${index === data.services.length - 1 ? "rounded-b-lg" : ""}`}>
            {/* Service Info */}
            <div className="flex flex-1 flex-col space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-emphasis text-sm font-medium">{getServiceDisplayName(service.name)}</h3>
                {service.isConfigured ? (
                  <Badge variant="green">Configured</Badge>
                ) : (
                  <Badge variant="gray">Not Configured</Badge>
                )}
              </div>
              <p className="text-default text-sm">
                {service.description || getServiceDescription(service.name)}
              </p>
            </div>

            {/* Provider Selector */}
            <div className="ml-4 flex min-w-[280px] items-center">
              <ServiceProviderSelector service={service} onUpdate={handleProviderUpdate} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper functions for display names and descriptions
const getServiceDisplayName = (serviceName: string): string => {
  const displayNames: Record<string, string> = {
    MESSAGING: "SMS & Messaging",
    PAYMENTS: "Payment Processing",
    EMAIL: "Email Delivery",
  };
  return displayNames[serviceName] || serviceName;
};

const getServiceDescription = (serviceName: string): string => {
  const descriptions: Record<string, string> = {
    MESSAGING: "Configure your default SMS and messaging service provider",
    PAYMENTS: "Configure your default payment processing provider",
    EMAIL: "Configure your default email delivery service provider",
  };
  return descriptions[serviceName] || "Configure your service provider";
};
