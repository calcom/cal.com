"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { identifyTrevoUser, initTrevo } from "../lib/trevo";

export function TrevoProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    initTrevo();
  }, []);

  useEffect(() => {
    if (userId) identifyTrevoUser(String(userId));
  }, [userId]);

  return <>{children}</>;
}
