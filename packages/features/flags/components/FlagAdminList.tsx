import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { PanelCard } from "@calcom/ui/components/card";
import { Switch } from "@calcom/ui/components/form";
import { ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { List } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";

export const FlagAdminList = () => {
  const [data] = trpc.viewer.features.list.useSuspenseQuery();

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
        <PanelCard
          key={type}
          title={type.replace(/_/g, " ")}
          collapsible
          defaultCollapsed={false}>
          <List roundContainer noBorderTreatment>
            {groupedFlags[type].map((flag, index) => (
              <ListItem
                key={flag.slug}
                rounded={index === 0 || index === groupedFlags[type].length - 1}>
                <div className="flex flex-1 flex-col">
                  <ListItemTitle component="h3">{flag.slug}</ListItemTitle>
                  <ListItemText component="p">{flag.description}</ListItemText>
                </div>
                <div className="flex py-2">
                  <FlagToggle flag={flag} />
                </div>
              </ListItem>
            ))}
          </List>
        </PanelCard>
      ))}
    </div>
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
