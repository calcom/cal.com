import { useMutation } from "react-query";

import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { App } from "@calcom/types/App";

import getInstalledAppPath from "./getInstalledAppPath";

function useAddAppMutation(_type: App["type"] | null, options?: Parameters<typeof useMutation>[2]) {
  const mutation = useMutation<
    unknown,
    Error,
    { type?: App["type"]; variant?: string; slug?: string; omni?: boolean } | ""
  >(async (variables) => {
    let type: string | null | undefined;
    let omni;
    if (variables === "") {
      type = _type;
    } else {
      omni = variables.omni;
      type = variables.type;
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
    if (!omni) {
      window.location.href = json.url;
    }
  }, options);

  return mutation;
}

export default useAddAppMutation;
