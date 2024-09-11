import type { FeatureFlagRepository } from "@calcom/lib/server/repository/featureFlag";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge, List, ListItem, ListItemText, ListItemTitle, Switch, showToast } from "@calcom/ui";
import { SkeletonText, SkeletonContainer } from "@calcom/ui";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle mb-8 mt-6 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

export type FlagAdminListProps = {
  ssrProps?: {
    featureFlags?: Awaited<ReturnType<typeof FeatureFlagRepository.getFeatureFlags>>;
  };
};

export const FlagAdminList = ({ ssrProps }: FlagAdminListProps) => {
  const { data, isPending: isPendingFeatureFlags } = trpc.viewer.features.list.useQuery(undefined, {
    enabled: !ssrProps?.featureFlags,
  });
  const featureFlags = ssrProps?.featureFlags ?? data;
  const isPending = ssrProps?.featureFlags ? false : isPendingFeatureFlags;

  if (isPending) {
    return <SkeletonLoader />;
  }

  return (
    <List roundContainer noBorderTreatment>
      {featureFlags?.map((flag) => (
        <ListItem key={flag.slug} rounded={false}>
          <div className="flex flex-1 flex-col">
            <ListItemTitle component="h3">
              {flag.slug}
              &nbsp;&nbsp;
              <Badge variant="green">{flag.type?.replace("_", " ")}</Badge>
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
