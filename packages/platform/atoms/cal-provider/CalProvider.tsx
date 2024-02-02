import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { AtomsContext } from "../hooks/useAtomsContext";
import { useOAuthClient } from "../hooks/useOAuthClient";
import { useOAuthFlow } from "../hooks/useOAuthFlow";
// import { useTimezone } from "../hooks/useTimezone";
import { useUpdateUserTimezone } from "../hooks/useUpdateUserTimezone";
import http from "../lib/http";

const queryClient = new QueryClient();

type CalProviderProps = {
  children?: ReactNode;
  clientId: string;
  accessToken: string;
  options: { refreshUrl?: string; apiUrl: string };
};

export function CalProvider({ clientId, accessToken, options, children }: CalProviderProps) {
  const [error, setError] = useState<string>("");

  const { mutateAsync } = useUpdateUserTimezone();
  const handleTimezoneChange = async (currentTimezone: string) => {
    await mutateAsync({ timeZone: currentTimezone });
  };

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

  // userTimezone is using react query
  // that is why it needs to be used inside of cal provider instead of here
  // useTimezone(handleTimezoneChange);

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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AtomsContext.Provider>
  ) : (
    <>{children}</>
  );
}
