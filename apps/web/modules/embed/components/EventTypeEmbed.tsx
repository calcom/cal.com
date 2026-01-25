import type { ComponentProps } from "react";

import { trpc } from "@calcom/trpc/react";

import { EmbedButton, EmbedDialog } from "./Embed";
import { tabs } from "@calcom/features/embed/lib/EmbedTabs";
import { useEmbedTypes } from "@calcom/features/embed/lib/hooks";
import { useBookerUrl } from "@calcom/web/modules/bookings/hooks/useBookerUrl";

export const EventTypeEmbedDialog = () => {
  const types = useEmbedTypes();
  const { data: user } = trpc.viewer.me.get.useQuery();
  const bookerUrl = useBookerUrl();

  return (
    <EmbedDialog
      types={types}
      tabs={tabs}
      eventTypeHideOptionDisabled={false}
      defaultBrandColor={user ? { brandColor: user.brandColor, darkBrandColor: user.darkBrandColor } : null}
      bookerUrl={bookerUrl}
    />
  );
};

export const EventTypeEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} />;
};
