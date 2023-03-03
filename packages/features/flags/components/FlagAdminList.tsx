import { trpc } from "@calcom/trpc/react";
import { Badge, List, ListItem, ListItemText, ListItemTitle, Switch } from "@calcom/ui";

export const FlagAdminList = () => {
  const [data] = trpc.viewer.features.list.useSuspenseQuery();
  return (
    <List roundContainer noBorderTreatment>
      {data.map((flag) => (
        <ListItem key={flag.slug} rounded={false} className="mb-4">
          <ListItemTitle component="h3">
            {flag.slug}
            <Badge variant="green">{flag.type}</Badge>
          </ListItemTitle>
          <ListItemText component="p">{flag.description}</ListItemText>
          <Switch checked={flag.enabled} />
        </ListItem>
      ))}
    </List>
  );
};
