import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { PanelCard } from "@calcom/ui/components/card";
import { ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { List } from "@calcom/ui/components/list";

type OrganizationFeatureFlagsListProps = {
  organizationId: number;
};

export const OrganizationFeatureFlagsList = ({ organizationId }: OrganizationFeatureFlagsListProps) => {
  const [data] = trpc.viewer.organizations.listTeamFeatures.useSuspenseQuery({ orgId: organizationId });

  const groupedFlags = data.reduce((acc, flag) => {
    const type = flag.type || "OTHER";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(flag);
    return acc;
  }, {} as Record<string, typeof data>);

  const sortedTypes = Object.keys(groupedFlags).sort();

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
                </div>
                <div className="flex items-center gap-2 py-2">
                  {flag.teams.length === 0 ? (
                    <span className="text-subtle text-sm">Nobody</span>
                  ) : (
                    <span className="text-default text-sm">
                      {flag.teams.map((team) => team.name).join(", ")}
                    </span>
                  )}
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
