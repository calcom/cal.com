import { useMutation } from "react-query";

import { NEXT_PUBLIC_BASE_URL } from "@calcom/lib/constants";

import type { IntegrationOAuthCallbackState } from "../types";

function useAddIntegrationMutation(appName: string) {
  const mutation = useMutation(async () => {
    const state: IntegrationOAuthCallbackState = {
      returnTo: NEXT_PUBLIC_BASE_URL + "/apps/installed" + location.search,
    };
    const stateStr = encodeURIComponent(JSON.stringify(state));
    const searchParams = `?state=${stateStr}`;
    const res = await fetch(`/api/integrations/${appName}/add` + searchParams);
    if (!res.ok) {
      throw new Error("Something went wrong");
    }
    const json = await res.json();
    window.location.href = json.url;
  });

  return mutation;
}

export default useAddIntegrationMutation;
