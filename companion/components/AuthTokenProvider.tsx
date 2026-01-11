import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { setAuthToken, setWebSession } from "../services/calcom";

export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated, isWebSession } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (accessToken) {
        setAuthToken(accessToken);
      }
      setWebSession(isWebSession);
    } else {
      setAuthToken(null);
      setWebSession(false);
    }
  }, [isAuthenticated, accessToken, isWebSession]);

  return <>{children}</>;
}
