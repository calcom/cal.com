import React, { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import BitcoinInstallForm from "@calcom/app-store/bitcoin/components/BitcoinInstallForm";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";

import { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const lnUrlName = getAppData("lnUrlName");
  const priceInSats = getAppData("priceInSats");
  const [showBitcoinSection, setShowBitcoinSection] = useState(getAppData("enabled"));

  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      switchOnClick={(e) => {
        setShowBitcoinSection(e);
      }}
      switchChecked={showBitcoinSection}>
      {showBitcoinSection && (
        <BitcoinInstallForm
          setAppData={setAppData}
          lnUrlName={lnUrlName}
          priceInSats={(priceInSats as number) || ""}
        />
      )}
    </AppCard>
  );
};

export default EventTypeAppCard;
