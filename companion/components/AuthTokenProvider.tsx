import { useAuth } from "../contexts/AuthContext";
import { CalComAPIService } from "../services/calcom";
import { useEffect } from "react";

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
