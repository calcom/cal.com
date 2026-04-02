import { tabs } from "@calcom/features/embed/lib/EmbedTabs";
import { useEmbedTypes } from "@calcom/features/embed/lib/hooks";
import { trpc } from "@calcom/trpc/react";
import type { ComponentProps } from "react";
import { EmbedButton, EmbedDialog } from "./Embed";

export const EventTypeEmbedDialog = () => {
  const types = useEmbedTypes();
  const { data: user } = trpc.viewer.me.get.useQuery();

  return (
    <EmbedDialog
      types={types}
      tabs={tabs}
      eventTypeHideOptionDisabled={false}
      defaultBrandColor={user ? { brandColor: user.brandColor, darkBrandColor: user.darkBrandColor } : null}
    />
  );
};

export const EventTypeEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} />;
};
