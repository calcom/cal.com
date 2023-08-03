import type { ComponentProps } from "react";

import { EmbedButton, EmbedDialog } from "./Embed";
import { tabs } from "./lib/EmbedTabs";

export const EventTypeEmbedDialog = () => {
  return <EmbedDialog tabs={tabs} eventTypeHideOptionDisabled={false} />;
};

export const EventTypeEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} />;
};
