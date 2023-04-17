import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import { trpc } from "@calcom/trpc";

interface SubdomainContextType {
  subdomain: string | undefined;
  isSubdomain: boolean;
  logoSrc?: string;
}

const SubdomainContext = createContext<SubdomainContextType>({ subdomain: undefined, isSubdomain: false });

export const useSubdomainContext = () => {
  return useContext(SubdomainContext);
};

interface SubdomainProviderProps {
  children: ReactNode;
}

export const SubdomainProvider = ({ children }: SubdomainProviderProps) => {
  const [enabled, setEnabled] = useState(true);
  const { data } = trpc.viewer.orgs.getLogo.useQuery(undefined, { enabled });

  // We only want this to run once so we disable the query after the first run
  useEffect(() => {
    if (!data?.isSubdomain) setEnabled(false); // If we're not on a subdomain, disable the query
    if (data?.subdomain && enabled) {
      setEnabled(false);
    }
  }, [data, enabled]);

  return (
    <SubdomainContext.Provider
      value={{ subdomain: data?.subdomain, logoSrc: data?.logo, isSubdomain: !!data?.isSubdomain }}>
      {children}
    </SubdomainContext.Provider>
  );
};
