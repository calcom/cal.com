import type { ComponentProps } from "react";

import { EmbedDialog, EmbedButton } from "@calcom/features/embed/Embed";
import { trpc } from "@calcom/trpc/react";

import { tabs } from "./lib/EmbedTabs";
import { useEmbedTypes } from "./lib/hooks";

export const RoutingFormEmbedDialog = () => {
  const types = useEmbedTypes();
  const { data: user } = trpc.viewer.me.useQuery();
  const routingFormTypes = types.filter((type) => type.type !== "email");
  return (
    <EmbedDialog
      types={routingFormTypes}
      tabs={tabs}
      eventTypeHideOptionDisabled={true}
      defaultBrandColor={user ? { brandColor: user.brandColor, darkBrandColor: user.darkBrandColor } : null}
    />
  );
};

export const RoutingFormEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} />;
};
