"use client";

import { useSession } from "next-auth/react";
import { createContext, useCallback, useState } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";

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
  const isAdminOrOwner = checkAdminOrOwner(session.data?.user?.org?.role);

  // Tracks the user's explicit selection. null = no explicit choice yet,
  // so we derive the default from the current session state.
  const [userOrgTeamsType, setUserOrgTeamsType] = useState<OrgTeamsType | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();

  // Derive orgTeamsType: user's explicit choice takes precedence,
  // otherwise fall back to session-derived default.
  // This avoids the old pattern of useState("yours") + useEffect correction,
  // which caused a scope flip ("user" → "org") and duplicate queries.
  const orgTeamsType = userOrgTeamsType ?? (isAdminOrOwner && currentOrgId ? "org" : "yours");

  const setOrgTeamsType = useCallback((type: OrgTeamsType) => {
    setUserOrgTeamsType(type);
  }, []);

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
