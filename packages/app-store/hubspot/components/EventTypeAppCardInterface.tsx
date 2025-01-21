import { usePathname } from "next/navigation";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Switch } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const pathname = usePathname();

  const { t } = useLocale();
  const { enabled, updateEnabled } = useIsAppEnabled(app);
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();

  const createContactUnderCompany = getAppData("createContactUnderCompany");

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
            label={t("hubspot_create_contact_under_company")}
            labelOnLeading
            checked={createContactUnderCompany}
            onCheckedChange={(checked) => {
              setAppData("createContactUnderCompany", checked);
            }}
          />
        </div>
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
