import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Switch } from "@calcom/ui/components/form";
import { ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { List } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";

type OrganizationFeatureFlagsListProps = {
  organizationId: number;
};

export const OrganizationFeatureFlagsList = ({ organizationId }: OrganizationFeatureFlagsListProps) => {
  const [data] = trpc.viewer.organizations.listTeamFeatures.useSuspenseQuery({ orgId: organizationId });
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());

  const groupedFlags = data.reduce((acc, flag) => {
    const type = flag.type || "OTHER";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(flag);
    return acc;
  }, {} as Record<string, typeof data>);

  const sortedTypes = Object.keys(groupedFlags).sort();

  const toggleExpanded = (slug: string) => {
    setExpandedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {sortedTypes.map((type) => (
        <PanelCard key={type} title={type.replace(/_/g, " ")} collapsible defaultCollapsed={false}>
          <List roundContainer noBorderTreatment>
            {groupedFlags[type].map((flag: Flag, index: number) => (
              <ListItem key={flag.slug} rounded={index === 0 || index === groupedFlags[type].length - 1}>
                <div className="flex flex-1 flex-col">
                  <ListItemTitle component="h3">{flag.slug}</ListItemTitle>
                  <ListItemText component="p">{flag.description}</ListItemText>
                  {expandedFlags.has(flag.slug) && (
                    <div className="mt-2 space-y-2">
                      <TeamFeatureToggles featureSlug={flag.slug} assignedTeams={flag.teams} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 py-2">
                  {flag.teams.length === 0 ? (
                    <span className="text-subtle text-sm">Nobody</span>
                  ) : (
                    <span className="text-default text-sm">
                      {flag.teams.map((team) => team.name).join(", ")}
                    </span>
                  )}
                  <Button
                    color="secondary"
                    size="sm"
                    variant="icon"
                    onClick={() => toggleExpanded(flag.slug)}
                    StartIcon={expandedFlags.has(flag.slug) ? "chevron-up" : "chevron-down"}
                  />
                </div>
              </ListItem>
            ))}
          </List>
        </PanelCard>
      ))}
    </div>
  );
};

type Flag = RouterOutputs["viewer"]["organizations"]["listTeamFeatures"][number];

type TeamFeatureTogglesProps = {
  featureSlug: string;
  assignedTeams: Array<{ id: number; name: string }>;
};

const TeamFeatureToggles = ({ featureSlug, assignedTeams }: TeamFeatureTogglesProps) => {
  const utils = trpc.useUtils();
  const { data: allTeams } = trpc.viewer.organizations.getTeams.useQuery();

  const mutation = trpc.viewer.organizations.toggleTeamFeature.useMutation({
    onSuccess: () => {
      showToast("Feature flag updated successfully", "success");
      utils.viewer.organizations.listTeamFeatures.invalidate();
    },
    onError: (error) => {
      showToast(error.message || "Failed to update feature flag", "error");
    },
  });

  if (!allTeams) {
    return null;
  }

  const assignedTeamIds = new Set(assignedTeams.map((t) => t.id));

  return (
    <div className="space-y-2 rounded-md border border-subtle p-3">
      {allTeams.map((team) => (
        <div key={team.id} className="flex items-center justify-between">
          <span className="text-sm">{team.name}</span>
          <Switch
            checked={assignedTeamIds.has(team.id)}
            onCheckedChange={(checked) => {
              mutation.mutate({
                teamId: team.id,
                featureSlug,
                enabled: checked,
              });
            }}
          />
        </div>
      ))}
    </div>
  );
};
