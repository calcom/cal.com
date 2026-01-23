import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CalComAPIService } from "@/services/calcom";

export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated, isWebSession: _isWebSession } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (accessToken) {
        CalComAPIService.setAccessToken(accessToken);
      }
    } else {
      CalComAPIService.clearAuth();
    }
  }, [isAuthenticated, accessToken]);

  return <>{children}</>;
}
