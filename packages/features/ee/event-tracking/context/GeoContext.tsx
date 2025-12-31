"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

interface GeoContextValue {
  country: string;
}

const GeoContext: React.Context<GeoContextValue | undefined> = createContext<
  GeoContextValue | undefined
>(undefined);

export function GeoProvider({
  country,
  children,
}: {
  country: string;
  children: ReactNode;
}): ReactNode {
  return <GeoContext.Provider value={{ country }}>{children}</GeoContext.Provider>;
}

export function useGeo(): GeoContextValue {
  const context = useContext(GeoContext);
  if (context === undefined) {
    throw new Error("useGeo must be used within a GeoProvider");
  }
  return context;
}
