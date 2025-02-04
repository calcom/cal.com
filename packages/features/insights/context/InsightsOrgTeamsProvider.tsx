"use client";

import { useSession } from "next-auth/react";
import { createContext, useState } from "react";

import type { OrgTeamsType } from "../filters/OrgTeamsFilter";

export type InsightsOrgTeamsContextType = {
  orgTeamsType: OrgTeamsType;
  setOrgTeamsType: (type: OrgTeamsType) => void;
  selectedTeamId: number | undefined;
  setSelectedTeamId: (id: number | undefined) => void;
};

export const InsightsOrgTeamsContext = createContext<InsightsOrgTeamsContextType | null>(null);

export function InsightsOrgTeamsProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const currentOrgId = session.data?.user.org?.id;
  const [orgTeamsType, setOrgTeamsType] = useState<OrgTeamsType>(currentOrgId ? "org" : "yours");
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();

  return (
    <InsightsOrgTeamsContext.Provider
      value={{
        orgTeamsType,
        setOrgTeamsType,
        selectedTeamId,
        setSelectedTeamId,
      }}>
      {children}
    </InsightsOrgTeamsContext.Provider>
  );
}
