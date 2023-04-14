import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect } from "react";

import { trpc } from "@calcom/trpc";

const useSubdomainCheck = () => {
  const router = useRouter();
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    const checkSubdomain = () => {
      const url = new URL(router.asPath, window.location.origin);
      const hostnameParts = url.hostname.split(".");

      if (hostnameParts.length >= 3) {
        const subdomain = hostnameParts.slice(0, -2).join(".");
        const domain = hostnameParts.slice(-2).join(".");
        if (domain === "cal.com" || domain === "cal.dev") {
          if (subdomain !== "app" && subdomain !== "console") {
            setIsSubdomain(true);
            setSubdomain(subdomain);
            console.log(`Subdomain found: ${subdomain}.${domain}`);
          }
        }
      }
    };
    if (router.isReady) {
      checkSubdomain();
    }
  }, [router]);

  return { isSubdomain, subdomain };
};

interface SubdomainContextType {
  subdomain: string | null;
  isSubdomain: boolean;
  logoSrc?: string;
}

const SubdomainContext = createContext<SubdomainContextType>({ subdomain: null, isSubdomain: false });

export const useSubdomainContext = () => {
  return useContext(SubdomainContext);
};

interface SubdomainProviderProps {
  children: ReactNode;
}

export const SubdomainProvider = ({ children }: SubdomainProviderProps) => {
  const { subdomain, isSubdomain } = useSubdomainCheck();
  const { data } = trpc.viewer.orgs.getLogo.useQuery(
    { subdomain },
    { enabled: !!(subdomain && isSubdomain) }
  );

  return (
    <SubdomainContext.Provider value={{ subdomain, isSubdomain, logoSrc: data }}>
      {children}
    </SubdomainContext.Provider>
  );
};
