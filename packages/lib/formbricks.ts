import formbricks from "@formbricks/js";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

export const initFormbricks = () => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    const [apiHost, environmentId] = process.env.NEXT_PUBLIC_FORMBRICKS.split("+");
    formbricks.init({
      environmentId,
      apiHost,
      debug: true,
    });
  }
};

export const setFormbricksUserId = (userId: string) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.setUserId(userId);
  }
};

export const setFormbricksEmail = (email: string) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.setEmail(email);
  }
};

export const setFormbricksAttribute = (key: string, value: string | number | boolean) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.setAttribute(key, value.toString());
  }
};

export const trackFormbricksAction = (eventName: string, properties: Record<string, string> = {}) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.track(eventName, properties);
  }
};

export const logoutFormbricks = () => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.logout();
  }
};

export const useFormbricks = () => {
  const { data: user, isLoading } = useMeQuery();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!isLoading && user && session) {
      initFormbricks();
      // set Formbricks attributes for targeted surveys
      setFormbricksUserId(user.id.toString());
      setFormbricksEmail(user.email);
      if (user?.name) {
        setFormbricksAttribute("name", user.name);
      }
      if (user?.username) {
        setFormbricksAttribute("username", user.username);
      }
      if (typeof session?.user?.belongsToActiveTeam !== "undefined") {
        setFormbricksAttribute("belongsToActiveTeam", session.user.belongsToActiveTeam?.toString());
      }
      if (typeof user?.organization?.isOrgAdmin !== "undefined") {
        setFormbricksAttribute("isOrganizationAdmin", user.organization?.isOrgAdmin.toString());
      }
    }
  }, [isLoading, user, status, session]);
};
