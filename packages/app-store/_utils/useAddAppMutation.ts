import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { App } from "@calcom/types/App";

function gotoUrl(url: string, newTab?: boolean) {
  if (newTab) {
    window.open(url, "_blank");
    return;
  }
  window.location.href = url;
}

type CustomUseMutationOptions =
  | Omit<UseMutationOptions<unknown, unknown, unknown, unknown>, "mutationKey" | "mutationFn" | "onSuccess">
  | undefined;

type AddAppMutationData = { setupPending: boolean; message?: string } | void;
export type UseAddAppMutationOptions = CustomUseMutationOptions & {
  onSuccess?: (data: AddAppMutationData) => void;
  installGoogleVideo?: boolean;
  returnTo?: string;
};

function useAddAppMutation(_type: App["type"] | null, options?: UseAddAppMutationOptions) {
  const pathname = usePathname();
  const onErrorReturnTo = `${WEBAPP_URL}${pathname}`;

  const mutation = useMutation<
    AddAppMutationData,
    Error,
    | {
        type?: App["type"];
        variant?: string;
        slug?: string;
        teamId?: number;
        returnTo?: string;
        defaultInstall?: boolean;
      }
    | ""
  >({
    ...options,
    mutationFn: async (variables) => {
      let type: string | null | undefined;
      const teamId = variables && variables.teamId ? variables.teamId : undefined;
      const defaultInstall = variables && variables.defaultInstall ? variables.defaultInstall : undefined;
      const returnTo = options?.returnTo
        ? options.returnTo
        : variables && variables.returnTo
        ? variables.returnTo
        : undefined;
      if (variables === "") {
        type = _type;
      } else {
        type = variables.type;
      }
      if (type?.endsWith("_other_calendar")) {
        type = type.split("_other_calendar")[0];
      }

      if (options?.installGoogleVideo && type !== "google_calendar")
        throw new Error("Could not install Google Meet");

      const state: IntegrationOAuthCallbackState = {
        onErrorReturnTo,
        fromApp: true,
        ...(teamId && { teamId }),
        ...(type === "google_calendar" && { installGoogleVideo: options?.installGoogleVideo }),
        ...(returnTo && { returnTo }),
        ...(defaultInstall && { defaultInstall }),
      };

      const stateStr = JSON.stringify(state);
      const searchParams = generateSearchParamString({
        stateStr,
        teamId,
        returnTo,
      });

      const res = await fetch(`/api/integrations/${type}/add${searchParams}`);

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.message || "Something went wrong");
      }

      const json = await res.json();
      const externalUrl = /https?:\/\//.test(json?.url) && !json?.url?.startsWith(window.location.origin);

      // Check first that the URL is absolute, then check that it is of different origin from the current.
      if (externalUrl) {
        // TODO: For Omni installation to authenticate and come back to the page where installation was initiated, some changes need to be done in all apps' add callbacks
        gotoUrl(json.url, json.newTab);
        return { setupPending: !json.newTab, message: json.message };
      } else if (json.url) {
        gotoUrl(json.url, json.newTab);
        return {
          setupPending:
            json?.url?.endsWith("/setup") || json?.url?.includes("/apps/installation/event-types"),
          message: json.message,
        };
      } else if (returnTo) {
        gotoUrl(returnTo, false);
        return { setupPending: true, message: json.message };
      } else {
        return { setupPending: false, message: json.message };
      }
    },
  });

  return mutation;
}

export default useAddAppMutation;
const generateSearchParamString = ({
  stateStr,
  teamId,
  returnTo,
}: {
  stateStr: string;
  teamId?: number;
  returnTo?: string;
}) => {
  const url = new URL("https://example.com"); // Base URL can be anything since we only care about the search params

  url.searchParams.append("state", stateStr);
  if (teamId !== undefined) {
    url.searchParams.append("teamId", teamId.toString());
  }
  if (returnTo) {
    url.searchParams.append("returnTo", returnTo);
  }

  // Return the search string part of the URL
  return url.search;
};
