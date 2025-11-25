import { NextResponse } from "next/server";

import { verifyCodeChallenge } from "@calcom/lib/pkce";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";

interface OAuthClient {
  clientType: "CONFIDENTIAL" | "PUBLIC";
  clientSecret?: string | null;
}

interface AccessCode {
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
}

export class OAuthService {
  static validateClient(
    client: OAuthClient,
    client_secret?: string,
    code_verifier?: string
  ): NextResponse | null {
    if (client.clientType === "CONFIDENTIAL") {
      if (!client_secret) {
        return NextResponse.json(
          { message: "client_secret required for confidential clients" },
          { status: 400 }
        );
      }

      const [hashedSecret] = generateSecret(client_secret);
      if (client.clientSecret !== hashedSecret) {
        return NextResponse.json({ message: "Invalid client_secret" }, { status: 401 });
      }
    } else if (client.clientType === "PUBLIC") {
      if (!code_verifier) {
        return NextResponse.json({ message: "code_verifier required for public clients" }, { status: 400 });
      }
    }
    return null;
  }

  static verifyPKCE(
    client: OAuthClient,
    accessCode: AccessCode,
    code_verifier?: string
  ): NextResponse | null {
    if (client.clientType === "PUBLIC") {
      if (!accessCode.codeChallenge) {
        return NextResponse.json(
          { message: "PKCE code challenge missing for public client" },
          { status: 400 }
        );
      }
      if (!code_verifier) {
        return NextResponse.json({ message: "code_verifier required for public clients" }, { status: 400 });
      }

      const method = accessCode.codeChallengeMethod || "S256";
      if (method !== "S256") {
        return NextResponse.json({ message: "code_challenge_method is not supported" }, { status: 400 });
      }
      if (!verifyCodeChallenge(code_verifier, accessCode.codeChallenge, method)) {
        return NextResponse.json({ message: "Invalid code_verifier" }, { status: 400 });
      }
    } else if (client.clientType === "CONFIDENTIAL" && accessCode.codeChallenge) {
      if (!code_verifier) {
        return NextResponse.json(
          { message: "code_verifier required if PKCE was used in original authorization" },
          { status: 400 }
        );
      }
      const method = accessCode.codeChallengeMethod || "S256";
      if (method !== "S256") {
        return NextResponse.json({ message: "code_challenge_method is not supported" }, { status: 400 });
      }
      if (!verifyCodeChallenge(code_verifier, accessCode.codeChallenge, method)) {
        return NextResponse.json({ message: "Invalid code_verifier" }, { status: 400 });
      }
    }

    return null;
  }
}
