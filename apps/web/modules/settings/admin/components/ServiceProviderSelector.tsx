"use client";

import { useState } from "react";

import type { ServiceName, ServiceProvider } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type ServiceWithStatus = {
  id: number | null;
  name: ServiceName;
  defaultProvider: ServiceProvider | null;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  isConfigured: boolean;
};

interface ServiceProviderSelectorProps {
  service: ServiceWithStatus;
  onUpdate?: () => void;
}

export const ServiceProviderSelector = ({ service, onUpdate }: ServiceProviderSelectorProps) => {
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(service.defaultProvider);

  const mutation = trpc.viewer.admin.thirdPartyService.updateServiceProvider.useMutation({
    onSuccess: (data) => {
      showToast(data.message, "success");
      setSelectedProvider(data.service.defaultProvider);
      onUpdate?.();
    },
    onError: (error) => {
      showToast(error.message || "Failed to update service provider", "error");
    },
  });

  const providerOptions = getProviderOptions(service.name);

  const handleProviderChange = (option: { label: string; value: ServiceProvider } | null) => {
    if (!option) return;

    const newProvider = option.value;

    // Don't update if it's the same provider
    if (newProvider === selectedProvider) return;

    mutation.mutate({
      serviceName: service.name,
      defaultProvider: newProvider,
    });
  };

  // If no providers available for this service yet
  if (providerOptions.length === 0) {
    return <div className="text-muted text-sm italic">No providers available yet</div>;
  }

  const selectedOption = selectedProvider
    ? providerOptions.find((opt) => opt.value === selectedProvider)
    : null;

  return (
    <div className="w-full">
      <SelectField
        name={`provider-${service.name}`}
        label="Default Provider"
        value={selectedOption}
        options={providerOptions}
        onChange={handleProviderChange}
        isDisabled={mutation.isPending}
        isSearchable={false}
        className="mb-0"
        containerClassName="space-y-1"
        placeholder="Select a provider..."
      />
    </div>
  );
};

// Helper function to get provider options for each service
const getProviderOptions = (serviceName: ServiceName): Array<{ label: string; value: ServiceProvider }> => {
  const providerOptionsMap: Record<
    ServiceName,
    Array<{ label: string; value: ServiceProvider; description?: string }>
  > = {
    MESSAGING: [
      {
        label: "Twilio",
        value: "TWILIO" as ServiceProvider,
        description: "Industry-leading SMS platform with global coverage",
      },
      {
        label: "ICS Mobile",
        value: "ICSMOBILE" as ServiceProvider,
        description: "Cost-effective regional SMS provider",
      },
    ],
    EMAIL: [],
    PAYMENTS: [],
  };

  return providerOptionsMap[serviceName] || [];
};
