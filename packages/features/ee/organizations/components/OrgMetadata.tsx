"use client";

import type { Team } from "@calcom/prisma/client";
import { Badge } from "@calcom/ui/components/badge";
import { PanelCard } from "@calcom/ui/components/card";

type Metadata = Record<string, any>;

export const OrgMetadata = ({ metadata }: { metadata: Team["metadata"] }) => {
  if (!metadata || typeof metadata !== "object" || Object.keys(metadata).length === 0) {
    return (
      <PanelCard title="Metadata">
        <div className="p-4 text-subtle text-sm">No metadata available for this organization.</div>
      </PanelCard>
    );
  }

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-subtle italic">null</span>;
    }
    if (typeof value === "boolean") {
      return <Badge variant={value ? "green" : "gray"}>{value ? "true" : "false"}</Badge>;
    }
    if (typeof value === "object") {
      return (
        <pre className="text-xs bg-subtle p-2 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    if (typeof value === "string" && value.startsWith("http")) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all">
          {value}
        </a>
      );
    }
    return <span className="text-default break-all">{String(value)}</span>;
  };

  const metadataObj = metadata as Metadata;
  const entries = Object.entries(metadataObj);

  return (
    <PanelCard title="Metadata" subtitle={`${entries.length} properties`} collapsible defaultCollapsed>
      <div className="divide-y divide-subtle">
        {entries.map(([key, value]) => (
          <div key={key} className="p-4">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-emphasis font-mono">{key}</div>
              <div className="text-sm">{renderValue(value)}</div>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
};
