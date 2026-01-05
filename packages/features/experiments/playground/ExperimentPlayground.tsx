"use client";

import { useSession } from "@calcom/lib/hooks/useSession";
import { Button } from "@calcom/ui/components/button";
import { Card } from "@calcom/ui/components/card";
import { useState } from "react";

import { useExperiment } from "../hooks/useExperiment";
import { trackExperimentConversion } from "../lib/posthog-tracker";

export const ExperimentPlayground = () => {
  const session = useSession();
  const [conversions, setConversions] = useState(0);

  const { variant, isLoading, assignmentType } = useExperiment("test-experiment", {
    userId: session.data?.user.id,
  });

  const handleConversion = () => {
    if (variant && assignmentType) {
      trackExperimentConversion("test-experiment", variant, assignmentType, {
        conversionEvent: "playground_button_clicked",
      });
      setConversions((c) => c + 1);
    }
  };

  if (isLoading) {
    return (
      <div class="space-y-6 p-6">
        <h1 class="text-2xl font-bold">Experiments Playground</h1>
        <p class="text-subtle">Loading...</p>
      </div>
    );
  }

  if (!variant) {
    return (
      <div class="space-y-6 p-6">
        <h1 class="text-2xl font-bold">Experiments Playground</h1>
        <Card class="p-6">
          <p class="text-destructive">
            No experiment found. Please run the SQL to create the test experiment:
          </p>
          <pre class="bg-subtle mt-4 rounded p-4 text-xs">
            {`INSERT INTO "Feature" (slug, type, enabled, metadata, description, "createdAt", "updatedAt")
VALUES (
  'test-experiment',
  'EXPERIMENT',
  true,
  '{"variants":[{"name":"control","percentage":50},{"name":"treatment","percentage":50}],"assignmentType":"DETERMINISTIC"}',
  'Test experiment for playground demo',
  NOW(),
  NOW()
);`}
          </pre>
        </Card>
      </div>
    );
  }

  const isControl = variant === "control";
  const buttonColor = isControl ? "secondary" : "primary";
  const buttonText = isControl ? "Manage Billing" : "Upgrade Now! 🚀";

  return (
    <div class="space-y-6 p-6">
      <h1 class="text-2xl font-bold">Experiments Playground</h1>

      <Card class="p-6 space-y-4">
        <div>
          <h2 class="text-lg font-semibold mb-2">Current Assignment</h2>
          <div class="bg-subtle rounded p-4 space-y-2">
            <p class="text-sm">
              <span class="text-subtle">Experiment:</span> <strong>test-experiment</strong>
            </p>
            <p class="text-sm">
              <span class="text-subtle">Variant:</span> <strong class="text-emphasis">{variant}</strong>
            </p>
            <p class="text-sm">
              <span class="text-subtle">Assignment Type:</span> <strong>{assignmentType}</strong>
            </p>
          </div>
        </div>

        <div>
          <h2 class="text-lg font-semibold mb-2">Test Component</h2>
          <p class="text-subtle text-sm mb-4">
            This button shows different variants based on your assignment. Click it to track a conversion
            event.
          </p>
          <div class="flex items-center gap-4">
            <Button color={buttonColor} onClick={handleConversion}>
              {buttonText}
            </Button>
            <span class="text-subtle text-sm">Conversions tracked: {conversions}</span>
          </div>
        </div>

        <div>
          <h2 class="text-lg font-semibold mb-2">How it works</h2>
          <ul class="text-subtle text-sm space-y-2 list-disc list-inside">
            <li>Your userId is hashed with the experiment slug using MurmurHash3</li>
            <li>The hash determines which bucket (variant) you fall into</li>
            <li>This assignment is stored in the database and remains consistent</li>
            <li>
              Exposure is automatically tracked to PostHog when the component renders (event:{" "}
              <code>experiment_viewed</code>)
            </li>
            <li>
              Conversions are tracked when you click the button (event: <code>experiment_conversion</code>)
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
