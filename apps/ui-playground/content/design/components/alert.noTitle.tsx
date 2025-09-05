"use client";

import { Alert } from "@calcom/ui/components/alert";
import { RenderComponentWithSnippet } from "@/app/components/render";

const severities = ["neutral", "info", "warning", "error"] as const;

export const NoTitleExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="not-prose space-y-4">
      {severities.map((severity) => (
        <Alert
          key={severity}
          severity={severity}
          message={`This is a ${severity} alert without a title to show a more compact version.`}
        />
      ))}
    </div>
  </RenderComponentWithSnippet>
);
