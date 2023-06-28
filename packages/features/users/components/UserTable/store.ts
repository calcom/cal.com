import { useRouter } from "next/router";
import { useEffect } from "react";
import { create } from "zustand";

import { trpc, type RouterOutputs } from "@calcom/trpc";

type Permissions = {
  isAdmin: boolean;
  isAdminOrOwner: boolean;
  isSelf?: boolean;
};

type Store = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  currentTeam?: RouterOutputs["viewer"]["organizations"]["listMembers"] | undefined;
  setCurrentTeam: (team: RouterOutputs["viewer"]["organizations"]["listMembers"]) => void;
  permissions: Permissions;
  setPermissions: (permissions: Permissions) => void;
};

export const useOrgMemberStore = create<Store>((set, get) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  currentTeam: undefined,
  setCurrentTeam: (team) => {
    set({ currentTeam: team });
    const isAdmin = team?.membership.role === "ADMIN";
    const isAdminOrOwner = isAdmin || team?.membership.role === "OWNER";
    set({
      permissions: {
        isAdmin,
        isAdminOrOwner,
      },
    });
  },
  permissions: {
    isAdmin: false,
    isAdminOrOwner: false,
  },
  setPermissions: (permissions) => set({ permissions }),
}));

export const useInitializeOrgMemberStore = () => {
  const setCurrentTeam = useOrgMemberStore((state) => state.setCurrentTeam);
  const setIsloading = useOrgMemberStore((state) => state.setIsLoading);
  const router = useRouter();
  const { data: team, isLoading } = trpc.viewer.organizations.listMembers.useQuery(undefined, {
    onError: () => {
      router.push("/settings");
    },
  });
  useEffect(() => {
    if (!isLoading && team) {
      setCurrentTeam(team);
    }
  }, [team, isLoading, setCurrentTeam]);

  useEffect(() => {
    setIsloading(isLoading);
  }, [isLoading]);
};
