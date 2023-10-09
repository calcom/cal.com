import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { trpc } from "@calcom/trpc/react";

import { SelectField } from "../../../ui/components/form/select/Select";
import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const { getAppData, setAppData } = useAppContextWithSchema<typeof appDataSchema>();

  const baseId = getAppData("baseId");
  const tableId = getAppData("tableId");
  const { enabled, updateEnabled } = useIsAppEnabled(app);
  const { data: bases } = trpc.viewer.appAirtable.bases.useQuery();
  const { data: tables } = trpc.viewer.appAirtable.tables.useQuery(
    { baseId: baseId as string },
    {
      enabled: typeof baseId === "string" && baseId !== "",
    }
  );

  const basesOption = bases?.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const tablesOption = tables?.tables?.map((item) => ({
    value: item.id,
    label: item.name,
  }));
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
        <div className="flex w-full flex-col gap-y-4">
          {basesOption && basesOption.length && (
            <SelectField
              className="w-full"
              label="Airtable Base"
              options={basesOption}
              value={basesOption?.find((item) => item.value === baseId)}
              onChange={(val) => {
                setAppData("baseId", val.value);
                setAppData("tableId", "");
              }}
            />
          )}

          {tablesOption && tablesOption.length && (
            <SelectField
              className="w-full"
              label="Airtable Table"
              options={tablesOption}
              value={tablesOption?.find((item) => item.value === tableId)}
              onChange={(val) => {
                setAppData("tableId", val.value);
              }}
            />
          )}
        </div>
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
