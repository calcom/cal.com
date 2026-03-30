"use client";

import type { PanelDefinition } from "@calcom/features/admin-dataview/types";
import { Badge } from "@calcom/ui/components/badge";
import { LoaderIcon } from "@coss/ui/icons";
import { trpc } from "@calcom/trpc/react";

import { BillingPanel } from "./BillingPanel";

const PANEL_COMPONENTS: Record<
  string,
  {
    Component: React.ComponentType<{ data: any; row: Record<string, unknown> }>;
    useData: (row: Record<string, unknown>) => { data: any; isPending: boolean };
  }
> = {
  billing: {
    Component: ({ data }) => <BillingPanel data={data} />,
    useData: (row) => {
      const teamId = row.id as number;
      const { data, isPending } = trpc.viewer.admin.dataview.billingByTeamId.useQuery(
        { teamId },
        { enabled: !!teamId }
      );
      return { data, isPending };
    },
  },
};

export function PanelRenderer({
  panel,
  row,
}: {
  panel: PanelDefinition;
  row: Record<string, unknown>;
}) {
  const registered = PANEL_COMPONENTS[panel.id];
  if (!registered) return null;
  if (panel.condition && !panel.condition(row)) return null;

  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-subtle">
      <PanelContent panel={panel} row={row} registered={registered} />
    </div>
  );
}

function PanelContent({
  panel,
  row,
  registered,
}: {
  panel: PanelDefinition;
  row: Record<string, unknown>;
  registered: (typeof PANEL_COMPONENTS)[string];
}) {
  const { data, isPending } = registered.useData(row);

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <span className="font-medium text-emphasis">{panel.label}</span>
      </div>
      <div className="border-t border-subtle px-3 py-2">
        {isPending ? (
          <div className="flex items-center justify-center py-4">
            <LoaderIcon className="text-muted h-4 w-4 animate-spin" />
          </div>
        ) : data ? (
          <registered.Component data={data} row={row} />
        ) : (
          <div className="text-muted py-4 text-center text-xs italic">No data</div>
        )}
      </div>
    </>
  );
}
