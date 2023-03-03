import { trpc } from "@calcom/trpc/react";
import { Badge, List, ListItem, ListItemText, ListItemTitle, Switch } from "@calcom/ui";

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
              <Badge variant="green">{flag.type}</Badge>
            </ListItemTitle>
            <ListItemText component="p">{flag.description}</ListItemText>
          </div>
          <div className="flex py-2">
            <Switch checked={flag.enabled} />
          </div>
        </ListItem>
      ))}
    </List>
  );
};
