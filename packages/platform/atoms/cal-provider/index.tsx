import axios from "axios";
import type { ReactNode } from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

import { NO_KEY_VALUE, INVALID_API_KEY } from "./errors";

type CalProviderProps = {
  apiKey: string;
  accessToken: string;
  refreshTokenEndpoint: string;
  children: ReactNode;
};

const ApiKeyContext = createContext({ key: "", error: "", accessToken: "" });

export const useApiKey = () => useContext(ApiKeyContext);

export function CalProvider({ apiKey, children, accessToken, refreshTokenEndpoint }: CalProviderProps) {
  const [key, setKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientAccessToken, setClientAccessToken] = useState("");

  const customClient = axios.create({
    baseURL: "http://localhost:5555/api/v2/",
    timeout: 1000,
  });

  customClient.interceptors.response.use(undefined, async (error) => {
    if (error.response.status === 404) {
      console.log(
        "the initial request has failed and thats why interceptor has been triggered".toLocaleUpperCase()
      );
    }

    const response = await fetch(refreshTokenEndpoint);

    if (response.ok) {
      const data = await response.json();
      setClientAccessToken(data.accessToken);
    }
  });

  const verifyApiKey = useCallback(
    async (key: string) => {
      try {
        // here we'll call the /me endpoint in v2 to get user profile
        const response = await fetch(`/api/v2/atoms/verifyClientKey/?${key}`);

        if (response.ok) {
          setKey(apiKey);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage(INVALID_API_KEY);
      }
    },
    [apiKey]
  );

  const verifyAccessToken = useCallback(
    async (accessToken: string) => {
      console.log("hello world", accessToken);

      try {
        const data = await customClient.get(`/api/v2/atoms/verifyAccessToken/${accessToken}`);
      } catch (error) {
        console.log(error);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (apiKey.length === 0) {
      setErrorMessage(NO_KEY_VALUE);
    } else {
      verifyApiKey(apiKey);
    }
  }, [verifyApiKey, apiKey]);

  useEffect(() => {
    if (accessToken.length === 0) {
    } else {
      verifyAccessToken(accessToken);
    }
  }, [accessToken, verifyAccessToken]);

  return (
    <ApiKeyContext.Provider value={{ key: key, error: errorMessage, accessToken: clientAccessToken }}>
      {children}
    </ApiKeyContext.Provider>
  );
}
