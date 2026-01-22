import { useIsEmbed, useEmbedUiConfig } from "@calcom/embed-core/embed-iframe";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";

export const useSlotsViewOnSmallScreen = () => {
  const isEmbed = useIsEmbed();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const embedUiConfig = useEmbedUiConfig();

  if (!isEmbed || !isMobile) return false;

  return embedUiConfig.useSlotsViewOnSmallScreen ?? false;
};
