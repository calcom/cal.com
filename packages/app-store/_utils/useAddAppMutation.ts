import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { App } from "@calcom/types/App";

import getInstalledAppPath from "./getInstalledAppPath";

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

type AddAppMutationData = { setupPending: boolean } | void;
type UseAddAppMutationOptions = CustomUseMutationOptions & {
  onSuccess?: (data: AddAppMutationData) => void;
  installGoogleVideo?: boolean;
  returnTo?: string;
};

function useAddAppMutation(_type: App["type"] | null, allOptions?: UseAddAppMutationOptions) {
  const { returnTo, ...options } = allOptions || {};
  const mutation = useMutation<
    AddAppMutationData,
    Error,
    { type?: App["type"]; variant?: string; slug?: string; isOmniInstall?: boolean; teamId?: number } | ""
  >(async (variables) => {
    let type: string | null | undefined;
    let isOmniInstall;
    const teamId = variables && variables.teamId ? variables.teamId : undefined;
    if (variables === "") {
      type = _type;
    } else {
      isOmniInstall = variables.isOmniInstall;
      type = variables.type;
    }
    if (type?.endsWith("_other_calendar")) {
      type = type.split("_other_calendar")[0];
    }

    if (options?.installGoogleVideo && type !== "google_calendar")
      throw new Error("Could not install Google Meet");

    const state: IntegrationOAuthCallbackState = {
      returnTo:
        returnTo ||
        WEBAPP_URL +
          getInstalledAppPath(
            { variant: variables && variables.variant, slug: variables && variables.slug },
            location.search
          ),
      ...(type === "google_calendar" && { installGoogleVideo: options?.installGoogleVideo }),
      ...(teamId && { teamId }),
    };

    const stateStr = encodeURIComponent(JSON.stringify(state));
    const searchParams = `?state=${stateStr}${teamId ? `&teamId=${teamId}` : ""}`;

    const res = await fetch(`/api/integrations/${type}/add${searchParams}`);

    if (!res.ok) {
      const errorBody = await res.json();
      throw new Error(errorBody.message || "Something went wrong");
    }

    const json = await res.json();
    const externalUrl = /https?:\/\//.test(json.url) && !json.url.startsWith(window.location.origin);
    if (!isOmniInstall) {
      gotoUrl(json.url, json.newTab);
      return { setupPending: externalUrl || json.url.endsWith("/setup") };
    }

    // Skip redirection only if it is an OmniInstall and redirect URL isn't of some other origin
    // This allows installation of apps like Stripe to still redirect to their authentication pages.

    // Check first that the URL is absolute, then check that it is of different origin from the current.
    if (externalUrl) {
      // TODO: For Omni installation to authenticate and come back to the page where installation was initiated, some changes need to be done in all apps' add callbacks
      gotoUrl(json.url, json.newTab);
      return { setupPending: externalUrl };
    }

    return { setupPending: externalUrl || json.url.endsWith("/setup") };
  }, options);

  return mutation;
}

export default useAddAppMutation;
