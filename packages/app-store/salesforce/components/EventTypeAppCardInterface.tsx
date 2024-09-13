import { usePathname } from "next/navigation";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Switch, Alert } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const pathname = usePathname();

  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);
  const isRoundRobinLeadSkipEnabled = getAppData("roundRobinLeadSkip");
  const isSkipContactCreationEnabled = getAppData("skipContactCreation");
  const { t } = useLocale();

  return (
    <AppCard
      returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
      app={app}
      teamId={eventType.team?.id || undefined}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      hideSettingsIcon>
      <>
        <div>
          <Switch
            label={t("skip_contact_creation", { appName: "Salesforce" })}
            labelOnLeading
            checked={isSkipContactCreationEnabled}
            onCheckedChange={(checked) => {
              setAppData("skipContactCreation", checked);
            }}
          />
        </div>
      </>
      {eventType.schedulingType === SchedulingType.ROUND_ROBIN ? (
        <div className="mt-4">
          <Switch
            label={t("skip_rr_assignment_label")}
            labelOnLeading
            checked={isRoundRobinLeadSkipEnabled}
            onCheckedChange={(checked) => {
              setAppData("roundRobinLeadSkip", checked);
              if (checked) {
                // temporary solution, enabled should always be already set
                setAppData("enabled", checked);
              }
            }}
          />
          <Alert className="mt-2" severity="neutral" title={t("skip_rr_description")} />
        </div>
      ) : null}
    </AppCard>
  );
};

export default EventTypeAppCard;
