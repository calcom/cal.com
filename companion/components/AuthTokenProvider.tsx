import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { CalComAPIService } from "../services/calcom";

export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated, isWebSession } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (accessToken) {
        CalComAPIService.setAccessToken(accessToken);
      }
    } else {
      CalComAPIService.clearAuth();
    }
  }, [isAuthenticated, accessToken, isWebSession]);

  return <>{children}</>;
}
