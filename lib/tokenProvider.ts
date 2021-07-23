interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

interface TokenCredentials {
  id: number;
  key: Record<"access_token" | "expiry_date" | "refresh_token", string>;
}

interface UserPasswordCredentials {
  user: string;
  password: string;
}

interface AuthHeader {
  Authorization: string;
}

export interface TokenProvider {
  isExpired(date: Date): boolean;
  refreshToken(refreshToken: string): Promise<string>;
  getToken(): Promise<string>;
  getAuthHeader(): Promise<AuthHeader>;
}

export class OAuthTokenProvider implements TokenProvider {
  constructor(
    private readonly url: string,
    private readonly credential: TokenCredentials,
    private readonly oauthCredential: OAuthCredentials,
    private readonly scopes: string[]
  ) {}

  private isExpired(expiryDate: Date): boolean {
    return expiryDate < Math.round(+new Date() / 1000);
  }

  private async refreshAccessToken(refreshToken: string) {
    const response = await fetch(`${this.url}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        scope: this.scopes,
        client_id: this.oauthCredential.clientId,
        client_secret: this.oauthCredential.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("OAuth2 referesh token error");
    }

    const responseBody = await response.json();

    this.credential.key.access_token = responseBody.access_token;
    this.credential.key.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in);

    await prisma.credential.update({
      where: {
        id: this.credential.id,
      },
      data: {
        key: this.credential.key,
      },
    });

    return this.credential.key.access_token;
  }

  public async getToken(): Promise<string> {
    return !this.isExpired(this.credential.key.expiry_date)
      ? Promise.resolve(this.credential.key.access_token)
      : this.refreshAccessToken(this.credential.key.refresh_token);
  }

  public async getAuthHeader(): Promise<AuthHeader> {
    const token = await this.getToken();

    return { Authorization: `Bearer ${token}` };
  }
}

export class BasicTokenProvider implements TokenProvider {
  constructor(private readonly credential: UserPasswordCredentials) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private isExpired(expiryDate: Date): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async refreshAccessToken(refreshToken: string) {
    return null;
  }

  public async getToken(): Promise<string> {
    return this.credential;
  }

  public async getAuthHeader(): Promise<AuthHeader> {
    const { user, password } = await this.getToken();

    return { Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}` };
  }
}
