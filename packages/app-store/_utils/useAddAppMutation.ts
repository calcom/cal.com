import { useMutation } from "react-query";

import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";
import { NEXT_PUBLIC_BASE_URL } from "@calcom/lib/constants";
import { App } from "@calcom/types/App";

function useAddAppMutation(type: App["type"], options?: Parameters<typeof useMutation>[2]) {
  const appName = type.replace("_", "");
  const mutation = useMutation(async () => {
    const state: IntegrationOAuthCallbackState = {
      returnTo: NEXT_PUBLIC_BASE_URL + location.pathname + location.search,
    };
    const stateStr = encodeURIComponent(JSON.stringify(state));
    const searchParams = `?state=${stateStr}`;
    const res = await fetch(`/api/integrations/${appName}/add` + searchParams);
    if (!res.ok) {
      throw new Error("Something went wrong");
    }
    const json = await res.json();
    window.location.href = json.url;
  }, options);

  return mutation;
}

export default useAddAppMutation;
