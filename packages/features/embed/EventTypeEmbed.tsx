import type { ComponentProps } from "react";

import { trpc } from "@calcom/trpc/react";

import { EmbedButton, EmbedDialog } from "./Embed";
import { tabs } from "./lib/EmbedTabs";
import { useEmbedTypes } from "./lib/hooks";

export const EventTypeEmbedDialog = () => {
  const types = useEmbedTypes();
  const { data: user } = trpc.viewer.me.useQuery();

  return (
    <EmbedDialog
      types={types}
      tabs={tabs}
      eventTypeHideOptionDisabled={false}
      defaultBrandColor={{
        brandColor: user?.brandColor,
        darkBrandColor: user?.darkBrandColor,
      }}
    />
  );
};

export const EventTypeEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} />;
};
