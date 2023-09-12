import type { ComponentProps } from "react";

import { EmbedButton, EmbedDialog } from "./Embed";
import { tabs } from "./lib/EmbedTabs";
import { useEmbedTypes } from "./lib/hooks";

export const EventTypeEmbedDialog = () => {
  const types = useEmbedTypes();

  return <EmbedDialog types={types} tabs={tabs} eventTypeHideOptionDisabled={false} />;
};

export const EventTypeEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} />;
};
