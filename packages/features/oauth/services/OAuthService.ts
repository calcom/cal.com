import { verifyCodeChallenge } from "@calcom/lib/pkce";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";

interface OAuthClient {
  clientType: "CONFIDENTIAL" | "PUBLIC";
  clientSecret?: string | null;
}

type OAuthErrorCode = "invalid_request" | "invalid_grant";

interface PKCESource {
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
}

interface OAuthErrorResult {
  error: OAuthErrorCode;
  status: number;
}

export class OAuthService {
  static validateClient(client: OAuthClient, client_secret?: string): boolean {
    if (client.clientType === "CONFIDENTIAL") {
      if (!client_secret) return false;

      const [hashedSecret] = generateSecret(client_secret);
      if (client.clientSecret !== hashedSecret) return false;
    }

    return true; // PUBLIC has no client_secret
  }

  /**
   * PKCE validator for BOTH:
   * - exchanging authorization code
   * - exchanging refresh token
   */
  static verifyPKCE(
    client: OAuthClient,
    source: PKCESource,
    code_verifier?: string
  ): OAuthErrorResult | null {
    // Determine if PKCE should be enforced
    const shouldEnforcePKCE =
      client.clientType === "PUBLIC" || (client.clientType === "CONFIDENTIAL" && source.codeChallenge);

    if (!shouldEnforcePKCE) return null;

    const method = source.codeChallengeMethod || "S256";

    if (!source.codeChallenge || !code_verifier || method !== "S256") {
      return { error: "invalid_request", status: 400 };
    }

    if (!verifyCodeChallenge(code_verifier, source.codeChallenge, method)) {
      return { error: "invalid_grant", status: 400 };
    }

    return null;
  }
}
