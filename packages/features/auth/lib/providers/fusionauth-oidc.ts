import type { Provider } from "next-auth/providers";

export interface FusionAuthOIDCConfig {
  clientId: string;
  clientSecret: string;
  issuer: string;
  name?: string;
  enabled?: boolean;
}

export const FusionAuthOIDCProvider = (config: FusionAuthOIDCConfig): Provider | undefined => {
  const {
    clientId,
    clientSecret,
    issuer,
    name = "FusionAuth",
    enabled = true,
  } = config;

  if (!enabled || !clientId || !clientSecret || !issuer) {
    return undefined;
  }

  return {
    id: "fusionauth-oidc",
    name,
    type: "oauth",
    version: "2.0",
    checks: ["pkce", "state"],
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    authorization: {
      url: `${issuer}/oauth2/authorize`,
      params: {
        scope: "openid profile email",
        response_type: "code",
        client_id: clientId,
      },
    },
    token: {
      url: `${issuer}/oauth2/token`,
      params: { grant_type: "authorization_code" },
    },
    userinfo: `${issuer}/oauth2/userinfo`,
    jwks_endpoint: `${issuer}/.well-known/jwks.json`,
    profile: async (profile: any) => {
      try {
        const mappedProfile = {
          id: profile.sub || profile.id || profile.user_id || "",
          email: profile.email?.toLowerCase() || "",
          name: profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim(),
          image: profile.picture || profile.avatar_url,
          email_verified: profile.email_verified || false,
          locale: profile.locale || "en",
        };

        // Validate required fields
        if (!mappedProfile.id) {
          throw new Error("Profile ID is required");
        }
        if (!mappedProfile.email) {
          throw new Error("Profile email is required");
        }
        if (!mappedProfile.name) {
          throw new Error("Profile name is required");
        }

        return mappedProfile as any;
      } catch (error) {
        throw error;
      }
    },
    options: {
      clientId,
      clientSecret,
    },
    allowDangerousEmailAccountLinking: true,
    issuer: issuer,
  };
};

export default FusionAuthOIDCProvider;
