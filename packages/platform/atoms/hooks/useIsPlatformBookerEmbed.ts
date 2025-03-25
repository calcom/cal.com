import { useAtomsContext } from "./useAtomsContext";

export const useIsPlatformBookerEmbed = () => {
  const context = useAtomsContext();
  return Boolean(context?.clientId && context?.isEmbed);
};
