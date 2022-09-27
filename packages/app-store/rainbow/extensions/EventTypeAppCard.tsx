import React, { useState } from "react";
import { useFormContext } from "react-hook-form";

import AppCard from "@calcom/app-store/_components/AppCard";
import RainbowInstallForm from "@calcom/app-store/rainbow/components/RainbowInstallForm";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  // TODO: Compute it.
  const hasRainbowIntegration = true;
  const { t } = useLocale();
  const formMethods = useFormContext();

  const [showRainbowSection, setShowRainbowSection] = useState(
    hasRainbowIntegration &&
      !!eventType.metadata["blockchainId"] &&
      !!eventType.metadata["smartContractAddress"]
  );

  return (
    <AppCard
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          formMethods.setValue("blockchainId", 1);
          formMethods.setValue("smartContractAddress", "");
        }

        setShowRainbowSection(e);
      }}
      switchChecked={showRainbowSection}>
      {showRainbowSection && (
        <RainbowInstallForm
          formMethods={formMethods}
          blockchainId={(eventType.metadata.blockchainId as number) || 1}
          smartContractAddress={(eventType.metadata.smartContractAddress as string) || ""}
        />
      )}
    </AppCard>
  );
};

export default EventTypeAppCard;
