import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getCenteredPopupFeatures } from "@calcom/lib/popup";
import { showToast } from "@calcom/ui/components/toast";
import type { App } from "@calcom/types/App";

function isInOnboardingEmbed() {
  return new URLSearchParams(window.location.search).get("onboardingEmbed") === "true";
}

function appendEmbedParamsToUrl(url: string, theme?: string | null): string {
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("calendarConnectPopup", "true");
  parsed.searchParams.set("onboardingEmbed", "true");
  if (theme) {
    parsed.searchParams.set("theme", theme);
  }
  return parsed.toString();
}

function openEmbedPopup(url: string, preOpenedPopup: Window | null): void {
  const theme = new URLSearchParams(window.location.search).get("theme");
  const popupUrl = appendEmbedParamsToUrl(url, theme);
  if (preOpenedPopup) {
    preOpenedPopup.location.href = popupUrl;
  } else {
    const popup = window.open(popupUrl, "calendar-connect-window", getCenteredPopupFeatures(600, 700));
    if (!popup) {
      showToast("Popup blocked by browser. Please allow popups for this site to connect your calendar.", "error");
    }
  }
}

function gotoUrl(url: string, newTab?: boolean, preOpenedPopup?: Window | null) {
  if (isInOnboardingEmbed()) {
    openEmbedPopup(url, preOpenedPopup ?? null);
    return;
  }
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
      const inOnboardingEmbed = isInOnboardingEmbed();
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

      // note(Lauris): pre-open popup synchronously before the async fetch — Safari and Mozilla block window.open() after await
      const preOpenedPopup = inOnboardingEmbed
        ? window.open("about:blank", "calendar-connect-window", getCenteredPopupFeatures(600, 700))
        : null;

      const res = await fetch(`/api/integrations/${type}/add${searchParams}`);

      if (!res.ok) {
        preOpenedPopup?.close();
        const errorBody = await res.json();
        throw new Error(errorBody.message || "Something went wrong");
      }

      const json = await res.json();
      const externalUrl = /https?:\/\//.test(json?.url) && !json?.url?.startsWith(window.location.origin);

      // Check first that the URL is absolute, then check that it is of different origin from the current.
      if (externalUrl) {
        // TODO: For Omni installation to authenticate and come back to the page where installation was initiated, some changes need to be done in all apps' add callbacks
        gotoUrl(json.url, json.newTab, preOpenedPopup);
        return { setupPending: inOnboardingEmbed ? false : !json.newTab, message: json.message };
      } else if (json.url) {
        gotoUrl(json.url, json.newTab, preOpenedPopup);
        return {
          setupPending: inOnboardingEmbed
            ? false
            : json?.url?.endsWith("/setup") || json?.url?.includes("/apps/installation/event-types"),
          message: json.message,
        };
      } else if (returnTo) {
        gotoUrl(returnTo, false, preOpenedPopup);
        return { setupPending: inOnboardingEmbed ? false : true, message: json.message };
      } else {
        preOpenedPopup?.close();
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
