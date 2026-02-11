import { Badge } from "@calid/features/ui/components/badge";
import { triggerToast } from "@calid/features/ui/components/toast";

import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Switch } from "@calcom/ui/components/form";
import { ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { List } from "@calcom/ui/components/list";

export const FlagAdminList = () => {
  const [data] = trpc.viewer.features.list.useSuspenseQuery();
  return (
    <List roundContainer noBorderTreatment>
      {data.map((flag) => (
        <ListItem key={flag.slug} rounded={false}>
          <div className="flex flex-1 flex-col">
            <ListItemTitle component="h3">
              {flag.slug}
              &nbsp;&nbsp;
              <Badge variant="success" size="sm">
                {flag.type?.replace("_", " ")}
              </Badge>
            </ListItemTitle>
            <ListItemText component="p">{flag.description}</ListItemText>
          </div>
          <div className="flex py-2">
            <FlagToggle flag={flag} />
          </div>
        </ListItem>
      ))}
    </List>
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
      triggerToast("Flags successfully updated", "success");
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
