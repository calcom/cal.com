"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Alert } from "@calcom/ui/components/alert";

const severities = ["neutral", "info", "warning", "error"] as const;

export const ActionsExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="no-prose space-y-4">
      {severities.map((severity) => (
        <Alert
          key={severity}
          severity={severity}
          title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} Alert with Actions`}
          message={`This is a ${severity} alert with action buttons.`}
          actions={
            <div className="flex space-x-2">
              <button className="rounded-md px-3 py-2 text-sm font-medium hover:opacity-90">Dismiss</button>
              <button className="rounded-md px-3 py-2 text-sm font-medium hover:opacity-90">View</button>
            </div>
          }
        />
      ))}
    </div>
  </RenderComponentWithSnippet>
);
