import { useAtomsContext } from "@calcom/platform-atoms";

export const useIsPlatform = () => {
  const context = useAtomsContext();
  return Boolean(context?.clientId);
};
