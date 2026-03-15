"use client";

import { DataTableProvider } from "~/data-table/DataTableProvider";
import { useSegments } from "~/data-table/hooks/useSegments";
import { WrongAssignmentReportsDashboard } from "@calcom/web/modules/insights/components/routing";

import { InsightsOrgTeamsProvider } from "../components/context/InsightsOrgTeamsProvider";

export default function InsightsWrongRoutingPage({ timeZone }: { timeZone: string }) {
  return (
    <DataTableProvider tableIdentifier="/insights/wrong-routing" useSegments={useSegments} timeZone={timeZone}>
      <InsightsOrgTeamsProvider>
        <WrongAssignmentReportsDashboard />
      </InsightsOrgTeamsProvider>
    </DataTableProvider>
  );
}
