import { ExperimentConfigSheet } from "@calcom/features/experiments/components/ExperimentConfigSheet";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Switch } from "@calcom/ui/components/form";
import { List, ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

import { AssignFeatureSheet } from "./AssignFeatureSheet";

export const FlagAdminList = () => {
  const [data] = trpc.viewer.features.list.useSuspenseQuery();
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [experimentConfigOpen, setExperimentConfigOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Flag | null>(null);

  const groupedFlags = data.reduce(
    (acc, flag) => {
      const type = flag.type || "OTHER";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(flag);
      return acc;
    },
    {} as Record<string, typeof data>
  );

  const sortedTypes = Object.keys(groupedFlags).sort();

  const handleAssignClick = (flag: Flag) => {
    setSelectedFlag(flag);
    setSheetOpen(true);
  };

  const handleConfigureExperiment = (flag: Flag) => {
    setSelectedExperiment(flag);
    setExperimentConfigOpen(true);
  };

  return (
    <>
      <div className="stack-y-4">
        {sortedTypes.map((type) => (
          <PanelCard key={type} title={type.replace(/_/g, " ")} collapsible defaultCollapsed={false}>
            <List roundContainer noBorderTreatment>
              {groupedFlags[type].map((flag: Flag, index: number) => (
                <ListItem key={flag.slug} rounded={index === 0 || index === groupedFlags[type].length - 1}>
                  <div className="flex flex-1 flex-col">
                    <ListItemTitle component="h3">{flag.slug}</ListItemTitle>
                    <ListItemText component="p">{flag.description}</ListItemText>
                    {flag.type === "EXPERIMENT" && flag.metadata && (
                      <div className="text-subtle text-xs mt-1">
                        <ExperimentMetadata metadata={flag.metadata} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <FlagToggle flag={flag} />
                    {flag.type === "EXPERIMENT" ? (
                      <Button
                        color="secondary"
                        size="sm"
                        variant="icon"
                        onClick={() => handleConfigureExperiment(flag)}
                        StartIcon="settings"
                      />
                    ) : (
                      <Button
                        color="secondary"
                        size="sm"
                        variant="icon"
                        onClick={() => handleAssignClick(flag)}
                        StartIcon="users"></Button>
                    )}
                  </div>
                </ListItem>
              ))}
            </List>
          </PanelCard>
        ))}
      </div>
      {selectedFlag && (
        <AssignFeatureSheet flag={selectedFlag} open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
      {selectedExperiment && (
        <ExperimentConfigSheet
          experiment={selectedExperiment}
          open={experimentConfigOpen}
          onOpenChange={setExperimentConfigOpen}
        />
      )}
    </>
  );
};

type Flag = RouterOutputs["viewer"]["features"]["list"][number];

const FlagToggle = (props: { flag: Flag }) => {
  const {
    flag: { slug, enabled },
  } = props;
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.admin.toggleFeatureFlag.useMutation({
    onSuccess: () => {
      showToast("Flags successfully updated", "success");
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
    const parsed = metadata as {
      variants?: Array<{ name: string; percentage: number }>;
      status?: "draft" | "running" | "paused" | "concluded";
      winnerVariant?: string;
    };
    if (parsed.variants) {
      return (
        <div className="flex items-center gap-2">
          {parsed.status && (
            <Badge
              variant={
                parsed.status === "running"
                  ? "green"
                  : parsed.status === "concluded"
                    ? "gray"
                    : parsed.status === "paused"
                      ? "orange"
                      : "blue"
              }>
              {parsed.status}
            </Badge>
          )}
          <span>Variants: {parsed.variants.map((v) => `${v.name} (${v.percentage}%)`).join(", ")}</span>
          {parsed.winnerVariant && <span className="text-success">Winner: {parsed.winnerVariant}</span>}
        </div>
      );
    }
  } catch {
    return null;
  }
  return null;
};
