import React, { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import RainbowInstallForm from "@calcom/app-store/rainbow/components/RainbowInstallForm";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";

import { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const blockchainId = getAppData("blockchainId");
  const smartContractAddress = getAppData("smartContractAddress");
  const [showRainbowSection, setShowRainbowSection] = useState(getAppData("enabled"));

  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      switchOnClick={(e) => {
        setShowRainbowSection(e);
      }}
      switchChecked={showRainbowSection}>
      {showRainbowSection && (
        <RainbowInstallForm
          setAppData={setAppData}
          blockchainId={blockchainId}
          smartContractAddress={(smartContractAddress as string) || ""}
        />
      )}
    </AppCard>
  );
};

export default EventTypeAppCard;
