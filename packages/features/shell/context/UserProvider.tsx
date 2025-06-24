"use client";

import { createContext, useContext, type ReactNode } from "react";

import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

type UserContextType = {
  user: ReturnType<typeof useMeQuery>["data"];
  isPending: boolean;
  isError: boolean;
};

const UserContext = createContext<UserContextType | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const { data: user, isPending, isError } = useMeQuery();

  const value: UserContextType = {
    user,
    isPending,
    isError,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
