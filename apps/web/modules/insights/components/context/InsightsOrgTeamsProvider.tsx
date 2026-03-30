"use client";

import { useSession } from "next-auth/react";
import { createContext, useEffect, useRef, useState } from "react";

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

  const [orgTeamsType, setOrgTeamsType] = useState<OrgTeamsType>(
    isAdminOrOwner && currentOrgId ? "org" : "yours"
  );
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();

  // Track whether the session has been loaded and initial state synced.
  // useState's initial value is only used on the first render, so if the session
  // isn't available yet (e.g. during SSR/hydration in production), orgTeamsType
  // defaults to "yours". This effect corrects it once the session loads.
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current && session.status === "authenticated") {
      isInitializedRef.current = true;
      const shouldBeOrg = isAdminOrOwner && currentOrgId;
      if (shouldBeOrg) {
        setOrgTeamsType("org");
      }
    }
  }, [session.status, isAdminOrOwner, currentOrgId]);

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
