"use client";

import { createContext, useContext } from "react";

interface GeoContextValue {
  country: string;
}

const GeoContext = createContext<GeoContextValue | undefined>(undefined);

export function GeoProvider({
  country,
  children,
}: {
  country: string;
  children: React.ReactNode;
}) {
  return <GeoContext.Provider value={{ country }}>{children}</GeoContext.Provider>;
}

export function useGeo() {
  const context = useContext(GeoContext);
  if (context === undefined) {
    throw new Error("useGeo must be used within a GeoProvider");
  }
  return context;
}
