import { useIsEmbed, useEmbedUiConfig } from "@calcom/embed-core/embed-iframe";

export const useEnableTwoStepSlotSelection = () => {
  const isEmbed = useIsEmbed();
  const embedUiConfig = useEmbedUiConfig();

  if (!isEmbed) return false;

  return embedUiConfig.enableTwoStepSlotSelection ?? false;
};
