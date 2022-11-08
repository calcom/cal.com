import { useMutation, UseMutationOptions } from "@tanstack/react-query";

import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { App } from "@calcom/types/App";

import getInstalledAppPath from "./getInstalledAppPath";

type TData = {
  setupRequiredForInstallation: boolean;
};

type TError = Error;
type TVariables = { type?: App["type"]; variant?: string; slug?: string; isOmniInstall?: boolean } | "";
/**
 * TODO: It should accept `slug` instead of `type`.
 */
function useAddAppMutation(
  _type: App["type"] | null,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn">
) {
  const mutation = useMutation<TData, TError, TVariables>(async (variables) => {
    let type: string | null | undefined;
    let isOmniInstall;
    if (variables === "") {
      type = _type;
    } else {
      isOmniInstall = variables.isOmniInstall;
      type = variables.type;
    }

    //Type _other_calendar apps aren't supported yet with CLI properly.
    // If we change their type to the same as slug the app logic that depends on checking the presence of _calendar breaks and if we keep the type as is, it is different from slug.
    // TODO: Work on removing dependency of having type contain _calendar
    if (type === "sendgrid_other_calendar") {
      type = "sendgrid";
    }
    const state: IntegrationOAuthCallbackState = {
      returnTo:
        WEBAPP_URL +
        getInstalledAppPath(
          { variant: variables && variables.variant, slug: variables && variables.slug },
          location.search
        ),
    };
    const stateStr = encodeURIComponent(JSON.stringify(state));
    const searchParams = `?state=${stateStr}`;
    const res = await fetch(`/api/integrations/${type}/add` + searchParams);

    if (!res.ok) {
      const errorBody = await res.json();
      throw new Error(errorBody.message || "Something went wrong");
    }

    const json = await res.json();

    if (!isOmniInstall) {
      window.location.href = json.url;
    } else {
      // Skip redirection only if it is an OmniInstall and redirect URL isn't of some other origin
      // This allows installation of apps like Stripe to still redirect to their authentication pages.

      // Check first that the URL is absolute, then check that it is of different origin from the current.
      if (/https?:\/\//.test(json.url) && !json.url.startsWith(window.location.origin)) {
        // TODO: For Omni installation to authenticate and come back to the page where installation was initiated, some changes need to be done in all apps' add callbacks
        window.location.href = json.url;
      }
    }

    return {
      setupRequiredForInstallation: json.url.includes("setupRequiredForInstallation=true"),
    };
  }, options);

  return mutation;
}

export default useAddAppMutation;
