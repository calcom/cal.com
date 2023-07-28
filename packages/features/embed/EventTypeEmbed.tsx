import type { ComponentProps } from "react";

import { EmbedDialog, EmbedButton } from "./Embed";
import { useEmbedTypes } from "./hooks/useEmbedTypes";
import { tabs } from "./lib/EmbedTabs";

export const EventTypeEmbedDialog = () => {
  const types = useEmbedTypes();
  return <EmbedDialog types={types} tabs={tabs} eventTypeHideOptionDisabled={false} />;
};

export const EventTypeEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} />;
};
