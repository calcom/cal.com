"use client";

import { Alert } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function AlertDemo() {
  const severities = ["neutral", "info", "warning", "error"] as const;
  const customIcons = ["info", "alert-triangle", "circle-x", "circle-check", "bell"] as const;

  return (
    <DemoSection title="Alert">
      {/* Basic Alerts */}
      <DemoSubSection id="alert-basic" title="Basic">
        <div className="space-y-4">
          {severities.map((severity) => (
            <Alert
              key={severity}
              severity={severity}
              title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} Alert`}
              message={`This is a ${severity} alert message to show important information to users.`}
            />
          ))}
        </div>
      </DemoSubSection>

      {/* Alerts with Actions */}
      <DemoSubSection id="alert-with-actions" title="With Actions">
        <div className="space-y-4">
          {severities.map((severity) => (
            <Alert
              key={severity}
              severity={severity}
              title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} Alert with Actions`}
              message={`This is a ${severity} alert with action buttons.`}
              actions={
                <div className="flex space-x-2">
                  <button className="rounded-md px-3 py-2 text-sm font-medium hover:opacity-90">
                    Dismiss
                  </button>
                  <button className="rounded-md px-3 py-2 text-sm font-medium hover:opacity-90">View</button>
                </div>
              }
            />
          ))}
        </div>
      </DemoSubSection>

      {/* Alerts with Custom Icons */}
      <DemoSubSection id="alert-custom-icons" title="Custom Icons">
        <div className="space-y-4">
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
      </DemoSubSection>

      {/* Alerts with Custom Icon Colors */}
      <DemoSubSection id="alert-custom-icon-colors" title="Custom Icon Colors">
        <div className="space-y-4">
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
      </DemoSubSection>

      {/* Alerts without Title */}
      <DemoSubSection id="alert-no-title" title="Without Title">
        <div className="space-y-4">
          {severities.map((severity) => (
            <Alert
              key={severity}
              severity={severity}
              message={`This is a ${severity} alert without a title to show a more compact version.`}
            />
          ))}
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
