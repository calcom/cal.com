"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Alert } from "@calcom/ui/components/alert";

const severities = ["neutral", "info", "warning", "error"] as const;

export const CustomIconColorExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="not-prose space-y-4">
      {severities.map((severity) => (
        <Alert
          key={severity}
          severity={severity}
          CustomIcon="bell"
          customIconColor="text-emphasis"
          title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} Alert with Custom Icon Color`}
          message="This alert uses a custom icon color."
        />
      ))}
    </div>
  </RenderComponentWithSnippet>
);
