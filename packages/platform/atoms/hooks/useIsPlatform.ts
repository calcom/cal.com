import { useAtomsContext } from "./useAtomsContext";

export const useIsPlatform = () => {
  const context = useAtomsContext();
  return Boolean(context?.clientId);
};
