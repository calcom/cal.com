import { mercadoPagoOAuthTokenSchema, type MercadoPagoCredentialSchema } from "./mercadoPagoCredentialSchema";

class MercadoPago {
  readonly authUrl = "https://auth.mercadopago.com";
  readonly url = "https://api.mercadopago.com";
  clientId: string;
  clientSecret: string;
  userCredentials?: MercadoPagoUserCredential;

  constructor(opts: { clientId: string; clientSecret: string; userCredentials?: MercadoPagoUserCredential }) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.userCredentials = opts.userCredentials;
  }

  /**
   * @returns Redirect uri to MercadoPago's callback in Cal.com
   */
  private getRedirectUri() {
    const NGROK_TUNNEL = "https://5fc518aa5ef9.ngrok.app";
    // TODO: Uncomment and remove ngrok tunnel before creating PR.
    // const redirectUri = encodeURI(WEBAPP_URL + "/api/integrations/mercadopago/callback");
    const redirectUri = encodeURI(NGROK_TUNNEL + "/api/integrations/mercadopago/callback");
    return redirectUri;
  }

  /**
   * Retrieves the MercadoPago OAuth Url
   *
   * For more information about the OAuth
   * @url https://mercadopago.com.pe/developers/es/reference/oauth/_oauth_token/post
   *
   * @param state State to receive on the callback url as query param after the successful OAuth
   */
  getOAuthUrl(state: string): string {
    const params = new URLSearchParams();
    params.set("client_id", this.clientId);
    params.set("response_type", "code");
    params.set("platform_id", "mp");
    params.set("redirect_uri", this.getRedirectUri());
    params.set("state", state);

    const url = `${this.authUrl}/authorization?${params}`;

    return url;
  }

  /**
   * Creates or refreshes OAuth token
   *
   * For more information:
   * @url https://www.mercadopago.com.pe/developers/es/reference/oauth/_oauth_token/post
   *
   * @param obj
   * @param obj.code Code granted by the authentication server so that the application can obtain an access token and an associated refresh token. It has a validity of 10 minutes counted from its generation.
   * @param obj.refreshToken Token received when the access token is created.
   */
  async getOAuthToken({ code, refreshToken }: GetOAuthTokenArg): Promise<MercadoPagoCredentialSchema> {
    const response = await fetch(`${this.url}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_secret: this.clientSecret,
        test_token: process.env.NODE_ENV !== "production",
        ...(code
          ? {
              grant_type: "authorization_code",
              code,
              redirect_uri: this.getRedirectUri(),
            }
          : {}),
        ...(refreshToken
          ? {
              grant_type: "refresh_token",
              refresh_token: refreshToken,
            }
          : {}),
      }),
    });

    const data = await response.json();

    if (data.error) {
      const { cause, error, error_description, status } = data;
      console.error("There was an error with retrieving MercadoPago OAuth token:", {
        cause,
        error,
        error_description,
        status,
      });
      throw new Error(error);
    }

    const credentials = mercadoPagoOAuthTokenSchema
      .transform((val) => ({ ...val, expires_at: Date.now() + val.expires_in * 1000 }))
      .parse(data);

    return credentials;
  }
}

export type MercadoPagoUserCredential = {
  id: number;
  key: MercadoPagoCredentialSchema;
};

type GetOAuthTokenArg =
  | { code: string; refreshToken?: undefined }
  | { refreshToken: string; code?: undefined };

export default MercadoPago;
