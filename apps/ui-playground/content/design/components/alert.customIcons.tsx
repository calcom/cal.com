"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Alert } from "@calcom/ui/components/alert";

const severities = ["neutral", "info", "warning", "error"] as const;
const customIcons = ["info", "alert-triangle", "circle-x", "circle-check", "bell"] as const;

export const CustomIconsExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="not-prose space-y-4">
      {severities.map((severity, index) => (
        <Alert
          key={severity}
          severity={severity}
          // @ts-expect-error Didnt type this as IconName for CustomIcon
          CustomIcon={customIcons[index % customIcons.length]}
          title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} Alert with Custom Icon`}
          message="This alert uses a custom icon instead of the default one."
        />
      ))}
    </div>
  </RenderComponentWithSnippet>
);
