import React, { useState } from "react";

//TODO:
import EventTypeAppContext from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import { SelectGifInput } from "@calcom/app-store/giphy/components";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app }) {
  //TODO: Compute it.
  const [getAppData, setAppData] = React.useContext(EventTypeAppContext);
  const thankYouPage = getAppData("thankYouPage");
  const [showGifSelection, setShowGifSelection] = useState(!!thankYouPage);
  const { t } = useLocale();

  return (
    <AppCard
      app={app}
      description={t("confirmation_page_gif")}
      switchOnClick={(e) => {
        if (!e) {
          setShowGifSelection(false);
          setAppData("thankYouPage", "");
        } else {
          setShowGifSelection(true);
        }
      }}
      switchChecked={showGifSelection}>
      {showGifSelection && (
        <SelectGifInput
          defaultValue={thankYouPage}
          onChange={(url: string) => {
            setAppData("thankYouPage", url);
          }}
        />
      )}
    </AppCard>
  );
};

export default EventTypeAppCard;
