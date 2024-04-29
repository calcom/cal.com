import type { ExchangeCodeResponse } from "../endpoints/oauth-flow/types";
import type { BasicPlatformResponse } from "../types";
import { Endpoints } from "./endpoints";
import type { HttpCaller } from "./http-caller";
import { X_CAL_SECRET_KEY } from "./http-caller";

export class SdkSecrets {
  private refreshedAt: Date | null;

  constructor(
    private readonly clientSecret: string,
    private accessToken: string,
    private refreshToken: string,
    private readonly httpCaller: HttpCaller
  ) {
    this.refreshedAt = null;
  }

  updateAccessToken(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;

    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
  }

  async refreshAccessToken(clientId: string) {
    const { data } = await this.httpCaller.post<BasicPlatformResponse<ExchangeCodeResponse>>(
      Endpoints.REFRESH_OAUTH_TOKEN,
      {
        urlParams: [clientId],
        body: {
          refreshToken: this.refreshToken,
        },
        config: {
          headers: {
            [X_CAL_SECRET_KEY]: this.clientSecret,
          },
        },
      }
    );

    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;

    this.refreshedAt = new Date();
  }

  public getAccessToken(): Readonly<string> {
    return this.accessToken;
  }

  public getClientSecret(): Readonly<string> {
    return this.clientSecret;
  }

  public isAccessTokenSet(): boolean {
    return !!this.accessToken;
  }

  public getRefreshedAt(): Date | null {
    return this.refreshedAt;
  }
}
