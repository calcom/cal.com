import { Toaster } from "@/components/ui/toaster";
import { useState } from "react";
import { useCallback } from "react";

import { AtomsContext } from "../hooks/useAtomsContext";
import { useOAuthClient } from "../hooks/useOAuthClient";
import { useOAuthFlow } from "../hooks/useOAuthFlow";
import { useTimezone } from "../hooks/useTimezone";
import { useUpdateUserTimezone } from "../hooks/useUpdateUserTimezone";
import http from "../lib/http";
import type { CalProviderProps } from "./CalProvider";

export function BaseCalProvider({ clientId, accessToken, options, children }: CalProviderProps) {
  const [error, setError] = useState<string>("");

  const { mutateAsync } = useUpdateUserTimezone();

  const handleTimezoneChange = useCallback(
    async (currentTimezone: string) => {
      await mutateAsync({ timeZone: currentTimezone });
    },
    [mutateAsync]
  );

  useTimezone(handleTimezoneChange);

  const { isInit } = useOAuthClient({
    clientId,
    apiUrl: options.apiUrl,
    refreshUrl: options.refreshUrl,
    onError: setError,
  });

  const { isRefreshing, currentAccessToken } = useOAuthFlow({
    accessToken,
    refreshUrl: options.refreshUrl,
    onError: setError,
    clientId,
  });

  return isInit ? (
    <AtomsContext.Provider
      value={{
        clientId,
        accessToken: currentAccessToken,
        options,
        error,
        getClient: () => http,
        isRefreshing: isRefreshing,
        isInit: isInit,
        isValidClient: Boolean(!error && clientId && isInit),
        isAuth: Boolean(
          isInit && !error && clientId && !isRefreshing && currentAccessToken && http.getAuthorizationHeader()
        ),
      }}>
      {children}
      <Toaster />
    </AtomsContext.Provider>
  ) : (
    <>
      {children}
      <Toaster />
    </>
  );
}
