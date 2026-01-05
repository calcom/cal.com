import type { RouterOutputs } from "@calcom/trpc/react";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Switch } from "@calcom/ui/components/form";
import { List, ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

export const ExperimentAdminList = () => {
  const [data] = trpc.viewer.features.list.useSuspenseQuery();

  const experiments = data.filter((flag) => flag.type === "EXPERIMENT");

  if (experiments.length === 0) {
    return (
      <div class="text-subtle text-center py-12">
        <p>No experiments configured yet.</p>
        <p class="text-sm mt-2">
          Create experiments by adding features with type EXPERIMENT in the database.
        </p>
      </div>
    );
  }

  return (
    <div class="stack-y-4">
      <PanelCard title="Active Experiments" collapsible defaultCollapsed={false}>
        <List roundContainer noBorderTreatment>
          {experiments.map((experiment, index) => (
            <ListItem key={experiment.slug} rounded={index === 0 || index === experiments.length - 1}>
              <div class="flex flex-1 flex-col">
                <ListItemTitle component="h3">{experiment.slug}</ListItemTitle>
                <ListItemText component="p">{experiment.description}</ListItemText>
                {experiment.metadata && (
                  <div class="text-subtle text-xs mt-1">
                    <ExperimentMetadata metadata={experiment.metadata} />
                  </div>
                )}
              </div>
              <div class="flex items-center gap-2 py-2">
                <ExperimentToggle experiment={experiment} />
              </div>
            </ListItem>
          ))}
        </List>
      </PanelCard>
    </div>
  );
};

type Experiment = RouterOutputs["viewer"]["features"]["list"][number];

const ExperimentToggle = (props: { experiment: Experiment }) => {
  const {
    experiment: { slug, enabled },
  } = props;
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.admin.toggleFeatureFlag.useMutation({
    onSuccess: () => {
      showToast("Experiment successfully updated", "success");
      utils.viewer.features.list.invalidate();
      utils.viewer.features.map.invalidate();
    },
  });
  return (
    <Switch
      defaultChecked={enabled}
      onCheckedChange={(checked) => {
        mutation.mutate({ slug, enabled: checked });
      }}
    />
  );
};

const ExperimentMetadata = ({ metadata }: { metadata: unknown }) => {
  try {
    const parsed = metadata as { variants?: Array<{ name: string; percentage: number }> };
    if (parsed.variants) {
      return <span>Variants: {parsed.variants.map((v) => `${v.name} (${v.percentage}%)`).join(", ")}</span>;
    }
  } catch {
    return null;
  }
  return null;
};
