import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { appDataSchema } from "../zod";
import EventTypeAppSettingsInterface from "./EventTypeAppSettingsInterface";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({
  app,
  eventType,
  onAppInstallSuccess,
}) {
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled: showGifSelection, updateEnabled: setShowGifSelection } = useIsAppEnabled(app);

  const { t } = useLocale();

  return (
    <AppCard
      onAppInstallSuccess={onAppInstallSuccess}
      app={app}
      description={t("confirmation_page_gif")}
      switchOnClick={(e) => {
        setShowGifSelection(e);
      }}
      switchChecked={showGifSelection}
      teamId={eventType.team?.id || undefined}>
      <EventTypeAppSettingsInterface
        eventType={eventType}
        slug={app.slug}
        disabled={disabled}
        getAppData={getAppData}
        setAppData={setAppData}
      />
    </AppCard>
  );
};

export default EventTypeAppCard;
