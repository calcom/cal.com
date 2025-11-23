import { Platform } from "react-native";

export interface WebSessionInfo {
  isLoggedIn: boolean;
  accessToken?: string;
  refreshToken?: string;
  userInfo?: any;
}

export class WebAuthService {
  // Check if running on web
  static isWeb(): boolean {
    return Platform.OS === "web";
  }

  // Get cookies from the browser
  static getCookies(): { [key: string]: string } {
    if (!this.isWeb()) return {};

    const cookies: { [key: string]: string } = {};
    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((cookie) => {
        const [name, value] = cookie.trim().split("=");
        if (name && value) {
          cookies[name] = decodeURIComponent(value);
        }
      });
    }
    return cookies;
  }

  // Check for Cal.com session cookies
  static async checkCalComSession(): Promise<WebSessionInfo> {
    if (!this.isWeb()) {
      return { isLoggedIn: false };
    }

    try {
      // Check for common Cal.com session cookies
      const cookies = this.getCookies();

      // Look for Cal.com authentication cookies
      // Common patterns: next-auth.session-token, __Secure-next-auth.session-token, etc.
      const sessionCookieNames = [
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
        "__Host-next-auth.session-token",
        "next-auth.csrf-token",
        "cal-session",
        "session-token",
      ];

      const foundSessionCookie = sessionCookieNames.find((name) => cookies[name]);

      if (foundSessionCookie) {
        // Try to validate the session with Cal.com API
        const sessionInfo = await this.validateWebSession();
        return sessionInfo;
      }

      return { isLoggedIn: false };
    } catch (error) {
      return { isLoggedIn: false };
    }
  }

  // Validate web session by calling Cal.com API with cookies
  static async validateWebSession(): Promise<WebSessionInfo> {
    if (!this.isWeb()) {
      return { isLoggedIn: false };
    }

    try {
      // First try to call the NextAuth session endpoint
      const sessionResponse = await fetch("https://app.cal.com/api/auth/session", {
        method: "GET",
        credentials: "include", // Include cookies
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();

        if (sessionData && sessionData.user) {
          // User is logged in via web session
          return {
            isLoggedIn: true,
            userInfo: sessionData.user,
          };
        }
      }

      // Try the internal Cal.com me endpoint (this might work with cookies)
      const meResponse = await fetch("https://app.cal.com/api/me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (meResponse.ok) {
        const userData = await meResponse.json();

        if (userData && (userData.id || userData.user || userData.data)) {
          return {
            isLoggedIn: true,
            userInfo: userData.user || userData.data || userData,
          };
        }
      }

      // Try to check if user is logged in by attempting to access a protected page
      const dashboardResponse = await fetch("https://app.cal.com/api/trpc/viewer.me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();

        if (dashboardData && dashboardData.result && dashboardData.result.data) {
          return {
            isLoggedIn: true,
            userInfo: dashboardData.result.data,
          };
        }
      }

      return { isLoggedIn: false };
    } catch (error) {
      return { isLoggedIn: false };
    }
  }

  // Try to get API tokens from web session
  static async getTokensFromWebSession(): Promise<{ accessToken?: string; refreshToken?: string }> {
    if (!this.isWeb()) {
      return {};
    }

    try {
      // Some Cal.com implementations might expose tokens via specific endpoints
      // This is a fallback approach - in practice, web sessions might not expose tokens directly

      // Check localStorage/sessionStorage for any stored tokens
      if (typeof window !== "undefined") {
        const localStorage = window.localStorage;
        const sessionStorage = window.sessionStorage;

        const possibleTokenKeys = [
          "cal-access-token",
          "cal-auth-token",
          "next-auth.token",
          "auth-token",
          "access-token",
        ];

        for (const key of possibleTokenKeys) {
          const localToken = localStorage.getItem(key);
          const sessionToken = sessionStorage.getItem(key);

          if (localToken || sessionToken) {
            return {
              accessToken: localToken || sessionToken || undefined,
            };
          }
        }
      }

      return {};
    } catch (error) {
      return {};
    }
  }

  // Redirect to Cal.com web login instead of using WebView
  static redirectToWebLogin(): void {
    if (!this.isWeb()) return;

    // For web, redirect directly to Cal.com login
    const currentUrl = window.location.href;
    const loginUrl = `https://app.cal.com/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`;

    window.location.href = loginUrl;
  }
}
