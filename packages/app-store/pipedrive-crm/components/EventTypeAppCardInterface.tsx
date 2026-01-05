import { usePathname } from "next/navigation";

import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useState } from "react";
import { Button } from "@calcom/ui/components/button";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType, onAppInstallSuccess }) {
  const pathname = usePathname();

  const { enabled, updateEnabled } = useIsAppEnabled(app);

  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const teamId = eventType.team?.id;
      const q = teamId ? `?teamId=${teamId}` : "";
      const res = await fetch(`/api/integrations/pipedrive/add${q}`);
      const json = await res.json();
      if (json?.url) {
        window.open(json.url, json.newTab ? "_blank" : "_self");
      }
    } catch (e) {
      // noop - AppCard flow will surface errors as well
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AppCard
        onAppInstallSuccess={onAppInstallSuccess}
        returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
        app={app}
        teamId={eventType.team?.id || undefined}
        switchOnClick={(e) => {
          updateEnabled(e);
        }}
        switchChecked={enabled}
        hideAppCardOptions
      />
      {app?.slug === "pipedrive-crm" && !enabled ? (
        <div style={{ marginTop: 8 }}>
          <Button onClick={handleConnect} loading={loading} size="sm">
            Connect Pipedrive
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default EventTypeAppCard;
