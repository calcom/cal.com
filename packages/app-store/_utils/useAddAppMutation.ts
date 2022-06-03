import { useMutation } from "react-query";

import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { AppMeta } from "@calcom/types/App";

function useAddAppMutation(type: AppMeta["type"], options?: Parameters<typeof useMutation>[2]) {
  // FIXME: Ensure that existing apps keep on working
  // const appName = type.replace(/_/g, "");
  const appName = type;
  const mutation = useMutation(async () => {
    const state: IntegrationOAuthCallbackState = {
      returnTo: WEBAPP_URL + "/apps/installed" + location.search,
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
