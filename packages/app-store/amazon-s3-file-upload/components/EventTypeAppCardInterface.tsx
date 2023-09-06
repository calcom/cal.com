import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const { getAppData, setAppData } = useAppContextWithSchema<typeof appDataSchema>();
  const s3Region = getAppData("s3Region");
  const s3Bucket = getAppData("s3Bucket");
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  return (
    <AppCard
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          updateEnabled(false);
        } else {
          updateEnabled(true);
        }
      }}
      switchChecked={enabled}
      teamId={eventType.team?.id || undefined}>
      <div className="mt-2 text-sm">
        <form className="grid-col grid gap-2">
          <TextField
            name="S3 Region"
            value={s3Region}
            onChange={(e) => setAppData("s3Region", e.target.value)}
          />
          <TextField
            name="S3 Bucket"
            value={s3Bucket}
            onChange={(e) => setAppData("s3Bucket", e.target.value)}
          />
        </form>

        <div />
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
