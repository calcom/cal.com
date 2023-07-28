import type { ComponentProps } from "react";

import { EmbedDialog, EmbedButton } from "@calcom/features/embed/Embed";

import { useEmbedTypes } from "./hooks/useEmbedTypes";
import { tabs } from "./lib/EmbedTabs";

export const RoutingFormEmbedDialog = () => {
  const types = useEmbedTypes();
  const routingFormTypes = types.filter((type) => type.type !== "email");
  return <EmbedDialog types={routingFormTypes} tabs={tabs} eventTypeHideOptionDisabled={true} />;
};

export const RoutingFormEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} />;
};
