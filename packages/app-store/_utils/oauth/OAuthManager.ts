/**
 * Manages OAuth2.0 tokens for an app and resourceOwner
 * It is unaware of Prisma and App logic. It is just a utility to manage OAuth2.0 tokens with life cycle methods
 *
 * For a recommended usage example, see Zoom VideoApiAdapter.ts
 */
import type { z } from "zod";

import { CREDENTIAL_SYNC_ENDPOINT } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { AxiosLikeResponseToFetchResponse } from "./AxiosLikeResponseToFetchResponse";
import type { OAuth2TokenResponseInDbWhenExistsSchema, OAuth2UniversalSchema } from "./universalSchema";
import { OAuth2UniversalSchemaWithCalcomBackwardCompatibility } from "./universalSchema";

const log = logger.getSubLogger({ prefix: ["app-store/_utils/oauth/OAuthManager"] });
export const enum TokenStatus {
  UNUSABLE_TOKEN_OBJECT,
  UNUSABLE_ACCESS_TOKEN,
  VALID,
}

type ResourceOwner =
  | {
      id: number | null;
      type: "team";
    }
  | {
      id: number | null;
      type: "user";
    };

type FetchNewTokenObject = ({ refreshToken }: { refreshToken: string | null }) => Promise<Response | null>;
type UpdateTokenObject = (
  token: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>
) => Promise<void>;
type isTokenObjectUnusable = (response: Response) => Promise<{ reason: string } | null>;
type isAccessTokenUnusable = (response: Response) => Promise<{ reason: string } | null>;
type IsTokenExpired = (token: z.infer<typeof OAuth2UniversalSchema>) => Promise<boolean> | boolean;
type InvalidateTokenObject = () => Promise<void>;
type ExpireAccessToken = () => Promise<void>;
type CredentialSyncVariables = {
  /**
   * The secret required to access the credential sync endpoint
   */
  CREDENTIAL_SYNC_SECRET: string | undefined;
  /**
   * The header name that the secret should be passed in
   */
  CREDENTIAL_SYNC_SECRET_HEADER_NAME: string;
  /**
   * The endpoint where the credential sync should happen
   */
  CREDENTIAL_SYNC_ENDPOINT: string | undefined;

  APP_CREDENTIAL_SHARING_ENABLED: boolean;
};
/**
 * Manages OAuth2.0 tokens for an app and resourceOwner
 */
export class OAuthManager {
  private currentTokenObject: z.infer<typeof OAuth2UniversalSchema>;
  private resourceOwner: ResourceOwner;
  private appSlug: string;
  private fetchNewTokenObject: FetchNewTokenObject;
  private updateTokenObject: UpdateTokenObject;
  private isTokenObjectUnusable: isTokenObjectUnusable;
  private isAccessTokenUnusable: isAccessTokenUnusable;
  private isTokenExpired: IsTokenExpired;
  private invalidateTokenObject: InvalidateTokenObject;
  private expireAccessToken: ExpireAccessToken;
  private credentialSyncVariables: CredentialSyncVariables;
  private useCredentialSync: boolean;
  private autoCheckTokenExpiryOnRequest: boolean;

  constructor({
    resourceOwner,
    appSlug,
    currentTokenObject,
    fetchNewTokenObject,
    updateTokenObject,
    isTokenObjectUnusable,
    isAccessTokenUnusable,
    invalidateTokenObject,
    expireAccessToken,
    credentialSyncVariables,
    autoCheckTokenExpiryOnRequest = true,
    isTokenExpired = (token: z.infer<typeof OAuth2TokenResponseInDbWhenExistsSchema>) => {
      return (token.expiry_date || 0) <= Date.now();
    },
  }: {
    /**
     * The resource owner for which the token is being managed
     */
    resourceOwner: ResourceOwner;
    /**
     * Does response for any request contain information that refresh_token became invalid and thus the entire token object become unusable
     * Note: Right now, the implementations of this function makes it so that the response is considered invalid(sometimes) even if just access_token is revoked or invalid. In that case, regenerating access token should work. So, we shouldn't mark the token as invalid in that case.
     * We should instead mark the token as expired. We could do that by introducing isAccessTokenInvalid function
     *
     * @param response
     * @returns
     */
    isTokenObjectUnusable: isTokenObjectUnusable;
    /**
     *
     */
    isAccessTokenUnusable: isAccessTokenUnusable;
    /**
     * The current token object.
     */
    currentTokenObject: z.infer<typeof OAuth2UniversalSchema>;
    /**
     * The unique identifier of the app that the token is for. It is required to do credential syncing in self-hosting
     */
    appSlug: string;
    /**
     *
     * It could be null in case refresh_token isn't available. This is possible when credential sync happens from a third party who doesn't want to share refresh_token
     */
    fetchNewTokenObject: FetchNewTokenObject;

    /**
     * update token object
     */
    updateTokenObject: UpdateTokenObject;
    /**
     * Handler to invalidate the token object. It is called when the token object is invalid and credential syncing is disabled
     */
    invalidateTokenObject: InvalidateTokenObject;
    /*
     * Handler to expire the access token. It is called when credential syncing is enabled and when the token object expires
     */
    expireAccessToken: ExpireAccessToken;
    /**
     * The variables required for credential syncing
     */
    credentialSyncVariables: CredentialSyncVariables;
    /**
     * If the token should be checked for expiry before sending a request
     */
    autoCheckTokenExpiryOnRequest?: boolean;
    /**
     * If there is a different way to check if the token is expired(and not the standard way of checking expiry_date)
     */
    isTokenExpired?: IsTokenExpired;
  }) {
    ensureValidResourceOwner(resourceOwner);
    this.resourceOwner = resourceOwner;
    this.currentTokenObject = currentTokenObject;
    this.appSlug = appSlug;
    this.fetchNewTokenObject = fetchNewTokenObject;
    this.isTokenObjectUnusable = isTokenObjectUnusable;
    this.isAccessTokenUnusable = isAccessTokenUnusable;
    this.isTokenExpired = isTokenExpired;
    this.invalidateTokenObject = invalidateTokenObject;
    this.expireAccessToken = expireAccessToken;
    this.credentialSyncVariables = credentialSyncVariables;
    this.useCredentialSync = !!(
      credentialSyncVariables.APP_CREDENTIAL_SHARING_ENABLED &&
      credentialSyncVariables.CREDENTIAL_SYNC_ENDPOINT &&
      credentialSyncVariables.CREDENTIAL_SYNC_SECRET_HEADER_NAME &&
      credentialSyncVariables.CREDENTIAL_SYNC_SECRET
    );
    this.autoCheckTokenExpiryOnRequest = autoCheckTokenExpiryOnRequest;
    this.updateTokenObject = updateTokenObject;
  }

  public async getTokenObjectOrFetch() {
    const myLog = log.getSubLogger({
      prefix: [`getTokenObjectOrFetch:appSlug=${this.appSlug}`],
    });
    const isExpired = await this.isTokenExpired(this.currentTokenObject);
    myLog.debug(
      "getTokenObjectOrFetch called",
      safeStringify({
        isExpired,
        resourceOwner: this.resourceOwner,
      })
    );

    if (!isExpired) {
      myLog.debug("Token is not expired. Returning the current token object");
      return { token: this.normalizeToken(this.currentTokenObject), isUpdated: false };
    } else {
      const token = {
        // Keep the old token object as it is, as some integrations don't send back all the props e.g. refresh_token isn't sent again by Google Calendar
        // It also allows any other properties set to be retained.
        ...this.currentTokenObject,
        ...this.normalizeToken(await this.refreshOAuthToken()),
      };
      myLog.debug("Token is expired. So, returning new token object");
      this.currentTokenObject = token;
      await this.updateTokenObject(token);
      return { token, isUpdated: true };
    }
  }

  public async request(arg: { url: string; options: RequestInit }): Promise<{
    tokenStatus: TokenStatus;
    json: unknown;
  }>;
  public async request<T>(
    customFetch: () => Promise<
      AxiosLikeResponseToFetchResponse<{
        status: number;
        statusText: string;
        data: T;
      }>
    >
  ): Promise<{
    tokenStatus: TokenStatus;
    json: T;
  }>;
  /**
   * Send request automatically adding the Authorization header with the access token. More importantly, handles token invalidation
   */
  public async request<T>(
    customFetchOrUrlAndOptions:
      | { url: string; options: RequestInit }
      | (() => Promise<
          AxiosLikeResponseToFetchResponse<{
            status: number;
            statusText: string;
            data: T;
          }>
        >)
  ) {
    let response;
    const myLog = log.getSubLogger({ prefix: ["request"] });

    if (this.autoCheckTokenExpiryOnRequest) {
      await this.getTokenObjectOrFetch();
    }

    if (typeof customFetchOrUrlAndOptions === "function") {
      myLog.debug("Sending request using customFetch");
      const customFetch = customFetchOrUrlAndOptions;
      try {
        response = await customFetch();
      } catch (e) {
        // Get response from error so that code further down can categorize it into tokenUnusable or access token unusable
        // Those methods accept response only
        response = handleFetchError(e);
      }
    } else {
      const { url, options } = customFetchOrUrlAndOptions;
      const headers = {
        Authorization: `Bearer ${this.currentTokenObject.access_token}`,
        ...options?.headers,
      };
      myLog.debug("Sending request using fetch", safeStringify({ customFetchOrUrlAndOptions, headers }));
      // We don't catch fetch error here because such an error would be temporary and we shouldn't take any action on it.
      response = await fetch(url, {
        method: "GET",
        ...options,
        headers: headers,
      });
    }

    myLog.debug(
      "Response from request",
      safeStringify({
        text: await response.clone().text(),
        status: response.status,
        statusText: response.statusText,
      })
    );

    const { tokenStatus, json } = await this.getAndValidateOAuth2Response({
      response,
    });

    if (tokenStatus === TokenStatus.UNUSABLE_TOKEN_OBJECT) {
      // In case of Credential Sync, we expire the token so that through the sync we can refresh the token
      // TODO: We should consider sending a special 'reason' query param to toke sync endpoint to convey the reason for getting token
      await this.invalidate();
    } else if (tokenStatus === TokenStatus.UNUSABLE_ACCESS_TOKEN) {
      await this.expireAccessToken();
    }

    // We are done categorizing the token status. Now, we can throw back
    if ("myFetchError" in (json || {})) {
      throw new Error(json.myFetchError);
    }

    return { tokenStatus: tokenStatus, json };
  }

  private async invalidate() {
    const myLog = log.getSubLogger({ prefix: ["invalidate"] });
    if (this.useCredentialSync) {
      myLog.debug("Expiring the access token");
      // We are not calling it through refreshOAuthToken flow because the token is refreshed already there
      // There is no point expiring the token as we will probably get the same result in that case.
      await this.expireAccessToken();
    } else {
      myLog.debug("Invalidating the token object");
      // In case credential sync is enabled there is no point of marking the token as invalid as user doesn't take action on that.
      // The third party needs to sync the correct credential back which we get done by marking the token as expired.
      await this.invalidateTokenObject();
    }
  }

  private normalizeToken(token: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>) {
    if (!token.expiry_date && !token.expires_in) {
      // Update expiry manually because if we keep using the old expiry the credential would expire soon
      // Use a practically infinite expiry(a year). Token is expected to be refreshed anyway in the meantime.
      token.expiry_date = Date.now() + 365 * 24 * 3600 * 1000;
    } else if (token.expires_in) {
      token.expiry_date = Math.round(Date.now() + token.expires_in * 1000);
    }
    return token;
  }
  // TODO: On regenerating access_token successfully, we should call makeTokenObjectValid(to counter invalidateTokenObject). This should fix stale banner in UI to reconnect when the connection is working
  private async refreshOAuthToken() {
    const myLog = log.getSubLogger({ prefix: ["refreshOAuthToken"] });
    let response;
    const refreshToken = this.currentTokenObject.refresh_token ?? null;
    if (this.resourceOwner.id && this.useCredentialSync) {
      if (
        !this.credentialSyncVariables.CREDENTIAL_SYNC_SECRET ||
        !this.credentialSyncVariables.CREDENTIAL_SYNC_SECRET_HEADER_NAME ||
        !this.credentialSyncVariables.CREDENTIAL_SYNC_ENDPOINT
      ) {
        throw new Error("Credential syncing is enabled but the required env variables are not set");
      }
      myLog.debug(
        "Refreshing OAuth token from credential sync endpoint",
        safeStringify({
          appSlug: this.appSlug,
          resourceOwner: this.resourceOwner,
          endpoint: CREDENTIAL_SYNC_ENDPOINT,
        })
      );

      try {
        response = await fetch(`${this.credentialSyncVariables.CREDENTIAL_SYNC_ENDPOINT}`, {
          method: "POST",
          headers: {
            [this.credentialSyncVariables.CREDENTIAL_SYNC_SECRET_HEADER_NAME]:
              this.credentialSyncVariables.CREDENTIAL_SYNC_SECRET,
          },
          body: new URLSearchParams({
            calcomUserId: this.resourceOwner.id.toString(),
            appSlug: this.appSlug,
          }),
        });
      } catch (e) {
        myLog.error("Could not refresh the token.", safeStringify(e));
        throw new Error(
          `Could not refresh the token due to connection issue with the endpoint: ${CREDENTIAL_SYNC_ENDPOINT}`
        );
      }

      const clonedResponse = response.clone();
      myLog.debug(
        "Response from credential sync endpoint",
        safeStringify({
          text: await clonedResponse.text(),
          ok: clonedResponse.ok,
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
        })
      );
    } else {
      myLog.debug(
        "Refreshing OAuth token",
        safeStringify({
          appSlug: this.appSlug,
          resourceOwner: this.resourceOwner,
        })
      );
      try {
        response = await this.fetchNewTokenObject({ refreshToken });
      } catch (e) {
        response = handleFetchError(e);
      }
      if (!response) {
        throw new Error("`fetchNewTokenObject` could not refresh the token");
      }
    }

    const { json, tokenStatus } = await this.getAndValidateOAuth2Response({
      response,
    });
    if (tokenStatus === TokenStatus.UNUSABLE_TOKEN_OBJECT) {
      await this.invalidateTokenObject();
    } else if (tokenStatus === TokenStatus.UNUSABLE_ACCESS_TOKEN) {
      await this.expireAccessToken();
    }
    const parsedToken = OAuth2UniversalSchemaWithCalcomBackwardCompatibility.safeParse(json);
    if (!parsedToken.success) {
      myLog.error("Token parsing error:", safeStringify(parsedToken.error.issues));
      throw new Error("Invalid token response");
    }
    return parsedToken.data;
  }

  private async getAndValidateOAuth2Response({ response }: { response: Response }) {
    const myLog = log.getSubLogger({ prefix: ["getAndValidateOAuth2Response"] });
    const tokenObjectUsabilityRes = await this.isTokenObjectUnusable(response.clone());
    const accessTokenUsabilityRes = await this.isAccessTokenUnusable(response.clone());
    const json = await response.json();

    if (tokenObjectUsabilityRes?.reason) {
      myLog.error("Token Object has become unusable");
      return {
        tokenStatus: TokenStatus.UNUSABLE_TOKEN_OBJECT,
        invalidReason: tokenObjectUsabilityRes.reason,
        json,
      } as const;
    }

    if (accessTokenUsabilityRes?.reason) {
      myLog.error("Access Token has become unusable");
      return {
        tokenStatus: TokenStatus.UNUSABLE_ACCESS_TOKEN,
        invalidReason: accessTokenUsabilityRes?.reason,
        json,
      };
    }

    // Any handlable not ok response should be handled through isTokenObjectUnusable or isAccessTokenUnusable but if still not handled, we should throw an error
    // So, that the caller can handle it. It could be a network error or some other temporary error from the third party App itself.
    if (!response.ok || (response.status < 200 && response.status >= 300)) {
      throw new Error(response.statusText);
    }

    // handle 204 response code with empty response (causes crash otherwise as "" is invalid JSON)
    if (response.status === 204) {
      return { tokenStatus: TokenStatus.VALID, json: null, invalidReason: null } as const;
    }

    return { tokenStatus: TokenStatus.VALID, json, invalidReason: null } as const;
  }
}

function ensureValidResourceOwner(
  resourceOwner: { id: number | null; type: "team" } | { id: number | null; type: "user" }
) {
  if (resourceOwner.type === "team") {
    throw new Error("Teams are not supported");
  } else {
    if (!resourceOwner.id) {
      throw new Error("resourceOwner should have id set");
    }
  }
}

/**
 * It converts error into a Response
 */
function handleFetchError(e: unknown) {
  const myLog = log.getSubLogger({ prefix: ["handleFetchError"] });
  myLog.debug("Error", safeStringify(e));
  if (e instanceof Error) {
    return new Response(JSON.stringify({ myFetchError: e.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ myFetchError: "UNKNOWN_ERROR" }), { status: 500 });
}
