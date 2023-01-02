import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import { SelectGifInput } from "@calcom/app-store/giphy/components";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const thankYouPage = getAppData("thankYouPage");
  const [showGifSelection, setShowGifSelection] = useState(getAppData("enabled"));
  const { t } = useLocale();

  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      description={t("confirmation_page_gif")}
      switchOnClick={(e) => {
        setShowGifSelection(e);
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
