"use client";

import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";

import { ServiceProviderSelector } from "./components/ServiceProviderSelector";

export const ThirdPartyServiceList = () => {
  const [data] = trpc.viewer.admin.thirdPartyService.getAllServices.useSuspenseQuery();
  const utils = trpc.useUtils();

  const handleProviderUpdate = () => {
    // Invalidate queries to refresh the list
    utils.viewer.admin.thirdPartyService.getAllServices.invalidate();
    utils.viewer.admin.thirdPartyService.getServiceProvider.invalidate();
  };

  return (
    <div className="space-y-6">
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
    EMAIL: "Configure your default email delivery service provider",
    PAYMENTS: "Configure your default payment processing provider",
  };
  return descriptions[serviceName] || "Configure your service provider";
};
