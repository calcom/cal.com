import React, { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";

import AppCard from "@calcom/app-store/_components/AppCard";
import { SelectGifInput } from "@calcom/app-store/giphy/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function EventTypeAppCard({ eventType, app }) {
  //TODO: Compute it.
  const hasGiphyIntegration = true;
  const [showGifSelection, setShowGifSelection] = useState(
    hasGiphyIntegration && !!eventType.metadata["giphyThankYouPage"]
  );
  const { t } = useLocale();

  const formMethods = useFormContext();

  return (
    <AppCard
      app={app}
      description={t("confirmation_page_gif")}
      switchOnClick={(e) => {
        if (!e) {
          setShowGifSelection(false);
          formMethods.setValue("giphyThankYouPage", "");
        } else {
          setShowGifSelection(true);
        }
      }}
      switchChecked={showGifSelection}>
      {showGifSelection && (
        <SelectGifInput
          defaultValue={eventType.metadata["giphyThankYouPage"] as string}
          onChange={(url: string) => {
            formMethods.setValue("giphyThankYouPage", url);
          }}
        />
      )}
    </AppCard>
  );
}
