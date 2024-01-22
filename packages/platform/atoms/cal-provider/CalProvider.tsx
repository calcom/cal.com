import { useUpdateUserTimezone } from "hooks/useUpdateUserTimezone";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { AtomsContext } from "../hooks/useAtomsContext";
import { useGetUserTimezone } from "../hooks/useGetUserTimezone";
import { useOAuthClient } from "../hooks/useOAuthClient";
import { useOAuthFlow } from "../hooks/useOAuthFlow";
import http from "../lib/http";

type CalProviderProps = {
  children?: ReactNode;
  clientId: string;
  accessToken: string;
  options: { refreshUrl?: string; apiUrl: string };
};

export function CalProvider({ clientId, accessToken, options, children }: CalProviderProps) {
  const [error, setError] = useState<string>("");
  const userPreferredTimezone = useGetUserTimezone(clientId);
  const currentUserTimezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  const { mutateAsync } = useUpdateUserTimezone();

  const updateUserTimezone = useCallback(
    async (preferredTimezone: string, currentTimezone: string) => {
      if (preferredTimezone !== currentTimezone) {
        await mutateAsync({ key: clientId, timeZone: currentTimezone });
      }
    },
    [clientId, mutateAsync]
  );

  useEffect(() => {
    updateUserTimezone(userPreferredTimezone, currentUserTimezone);
  }, [userPreferredTimezone, currentUserTimezone, updateUserTimezone]);

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
    </AtomsContext.Provider>
  ) : (
    <>{children}</>
  );
}
