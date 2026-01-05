"use client";

import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Card } from "@calcom/ui/components/card";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { useExperiment } from "../hooks/useExperiment";
import { trackExperimentConversion } from "../lib/posthog-tracker";
import { ExperimentStats } from "./ExperimentStats";

export function ExperimentPlayground() {
  const session = useSession();
  const utils = trpc.useUtils();

  const [experimentSlug, setExperimentSlug] = useState("test-experiment");
  const [customUserId, setCustomUserId] = useState("");
  const [conversions, setConversions] = useState(0);

  const userId = customUserId
    ? parseInt(customUserId, 10)
    : session.data?.user.id;

  const { variant, isLoading, assignmentType, isNewAssignment } = useExperiment(
    experimentSlug,
    {
      userId,
      skip: !userId,
    }
  );

  const { data: experiments } = trpc.viewer.features.list.useQuery();

  const createExperimentMutation =
    trpc.viewer.admin.updateExperimentConfig.useMutation({
      onSuccess: () => {
        showToast("test experiment created successfully", "success");
        utils.viewer.features.list.invalidate();
      },
      onError: (err) => {
        showToast(err.message, "error");
      },
    });

  const handleCreateTestExperiment = () => {
    createExperimentMutation.mutate({
      slug: "test-experiment",
      metadata: {
        variants: [
          { name: "control", percentage: 50 },
          { name: "treatment", percentage: 50 },
        ],
        assignmentType: "DETERMINISTIC",
        status: "running",
      },
    });
  };

  const handleConversion = () => {
    if (variant && assignmentType) {
      trackExperimentConversion(experimentSlug, variant, assignmentType, {
        conversionEvent: "playground_button_clicked",
        userId,
      });
      setConversions((c) => c + 1);
      showToast("conversion tracked!", "success");
    }
  };

  const handleRefreshAssignment = () => {
    setConversions(0);
    utils.viewer.experiments.getVariant.invalidate();
    utils.viewer.experiments.getExperimentStats.invalidate();
  };

  const testExperiment = experiments?.find(
    (f) => f.slug === experimentSlug && f.type === "EXPERIMENT"
  );

  if (!userId) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-emphasis text-2xl font-bold">
            experiments playground
          </h1>
          <p className="text-subtle mt-1">
            test experiment variant assignments and conversions
          </p>
        </div>
        <Card className="p-6">
          <p className="text-subtle">please log in to test experiments</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-emphasis text-2xl font-bold">
          experiments playground
        </h1>
        <p className="text-subtle mt-1">
          test experiment variant assignments and conversions
        </p>
      </div>

      {/* experiment setup */}
      <Card className="p-6">
        <h2 className="text-emphasis mb-4 text-lg font-semibold">
          experiment setup
        </h2>
        {!testExperiment && (
          <div className="bg-muted mb-4 rounded-md border p-4">
            <p className="text-subtle mb-3 text-sm">
              no test experiment found. create one to get started:
            </p>
            <Button
              onClick={handleCreateTestExperiment}
              loading={createExperimentMutation.isPending}
              size="sm"
            >
              create test-experiment
            </Button>
          </div>
        )}

        {testExperiment && (
          <div className="space-y-4">
            <div className="bg-muted rounded-md border p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-emphasis font-medium">
                    {testExperiment.slug}
                  </p>
                  <p className="text-subtle text-sm">
                    {testExperiment.description || "no description"}
                  </p>
                </div>
                <Badge variant={testExperiment.enabled ? "green" : "gray"}>
                  {testExperiment.enabled ? "enabled" : "disabled"}
                </Badge>
              </div>
              <ExperimentStats experimentSlug={experimentSlug} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">
                  experiment slug (optional)
                </label>
                <TextField
                  value={experimentSlug}
                  onChange={(e) => setExperimentSlug(e.target.value)}
                  placeholder="test-experiment"
                />
              </div>
              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">
                  test as user id (optional)
                </label>
                <TextField
                  type="number"
                  value={customUserId}
                  onChange={(e) => setCustomUserId(e.target.value)}
                  placeholder={`current: ${session.data?.user.id}`}
                />
                <p className="text-subtle mt-1 text-xs">
                  leave empty to use your current user id
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* current assignment */}
      {testExperiment && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-emphasis text-lg font-semibold">
              your assignment
            </h2>
            <Button
              size="sm"
              color="secondary"
              onClick={handleRefreshAssignment}
            >
              refresh assignment
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="bg-emphasis h-6 w-32 animate-pulse rounded-md" />
              <div className="bg-emphasis h-20 w-full animate-pulse rounded-md" />
            </div>
          )}

          {!isLoading && !variant && (
            <div className="bg-muted rounded-md border p-4">
              <p className="text-subtle text-sm">
                no variant assigned. make sure the experiment is enabled and
                running.
              </p>
            </div>
          )}

          {!isLoading && variant && (
            <div className="space-y-4">
              <div className="bg-subtle grid grid-cols-3 gap-4 rounded-md p-4">
                <div>
                  <p className="text-subtle mb-1 text-xs">variant</p>
                  <p className="text-emphasis text-lg font-semibold">
                    {variant}
                  </p>
                </div>
                <div>
                  <p className="text-subtle mb-1 text-xs">assignment type</p>
                  <p className="text-emphasis font-medium">{assignmentType}</p>
                </div>
                <div>
                  <p className="text-subtle mb-1 text-xs">status</p>
                  <Badge variant={isNewAssignment ? "blue" : "gray"}>
                    {isNewAssignment ? "new assignment" : "existing"}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-emphasis mb-2 text-sm font-medium">
                  test variant rendering
                </p>
                <p className="text-subtle mb-3 text-sm">
                  this simulates how you&apos;d use the variant in your app.
                  click the button to track a conversion.
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    color={variant === "control" ? "secondary" : "primary"}
                    onClick={handleConversion}
                  >
                    {variant === "control"
                      ? "standard button"
                      : "🚀 upgraded cta button!"}
                  </Button>
                  <span className="text-subtle text-sm">
                    conversions tracked: {conversions}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* how it works */}
      <Card className="p-6">
        <h2 className="text-emphasis mb-4 text-lg font-semibold">
          how experiments work
        </h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="bg-brand-default text-brand mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              1
            </div>
            <div>
              <p className="text-emphasis font-medium">variant assignment</p>
              <p className="text-subtle text-sm">
                users are assigned to variants based on a hash of their
                userId/teamId and experiment slug. this ensures consistent
                assignment across sessions.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-brand-default text-brand mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              2
            </div>
            <div>
              <p className="text-emphasis font-medium">exposure tracking</p>
              <p className="text-subtle text-sm">
                when useExperiment is called, an exposure event is automatically
                tracked to posthog with the variant assignment.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-brand-default text-brand mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              3
            </div>
            <div>
              <p className="text-emphasis font-medium">conversion tracking</p>
              <p className="text-subtle text-sm">
                call trackExperimentConversion() when users complete the target
                action (e.g., upgrade, booking created) to measure variant
                performance.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-brand-default text-brand mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              4
            </div>
            <div>
              <p className="text-emphasis font-medium">analysis & migration</p>
              <p className="text-subtle text-sm">
                use posthog to analyze variant performance. when complete, set a
                winner variant and migrate all users to it.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* code example */}
      <Card className="p-6">
        <h2 className="text-emphasis mb-4 text-lg font-semibold">
          usage example
        </h2>
        <pre className="bg-subtle overflow-x-auto rounded-md p-4 text-xs">
          {`import { useExperiment } from "@calcom/features/experiments";
import { trackExperimentConversion } from "@calcom/features/experiments";

function MyComponent() {
  const session = useSession();
  const { variant, isLoading } = useExperiment("cta-button-test", {
    userId: session.data?.user.id,
  });

  const handleUpgrade = () => {
    // track conversion when user upgrades
    trackExperimentConversion("cta-button-test", variant, assignmentType, {
      conversionEvent: "upgrade_completed",
      userId: session.data?.user.id,
    });

    // proceed with upgrade logic...
  };

  if (isLoading) return <Skeleton />;

  return (
    <Button
      color={variant === "control" ? "secondary" : "primary"}
      onClick={handleUpgrade}
    >
      {variant === "control" ? "Upgrade" : "🚀 Upgrade Now!"}
    </Button>
  );
}`}
        </pre>
      </Card>
    </div>
  );
}
