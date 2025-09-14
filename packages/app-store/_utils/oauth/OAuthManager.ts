/**
 * Manages OAuth2.0 as well as JWT tokens(For JWT tokens, only Google Calendar use it at the moment) for an app and resourceOwner.
 * What it does
 * - It automatically refreshes the token if needed when making a request.
 * - It is aware of the credential sync endpoint and can sync the token from the third party source.
 * - It is kept unaware of Prisma and App logic. It is just a utility to manage OAuth2.0 tokens with life cycle methods
 * - Prevents race conditions during token refresh using in-memory locking with optimistic concurrency control
 *
 * What it doesn't do yet
 * - It doesn't have a flow to re-send the request if the access-token had been communicated as invalid after making the request itself. It relies on the caller to make the next request in which it will actually refresh the token.
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
  INCONCLUSIVE,
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

type CurrentTokenObject = z.infer<typeof OAuth2UniversalSchema>;
type GetCurrentTokenObject = () => Promise<CurrentTokenObject>;
// Manages OAuth2.0 tokens for an app and resourceOwner
// Automatically handles token expiry, refresh, and race condition prevention
// Uses in-memory locking to prevent multiple simultaneous refresh operations
export class OAuthManager {
  protected currentTokenObject: CurrentTokenObject | null;
  private getCurrentTokenObject: GetCurrentTokenObject | null;
  private resourceOwner: ResourceOwner;
  private appSlug: string;
  private fetchNewTokenObject: FetchNewTokenObject;
  private updateTokenObject: UpdateTokenObject;
  private isTokenObjectUnusable: isTokenObjectUnusable;
  private isAccessTokenUnusable: isAccessTokenUnusable;
  private isTokenExpiring: IsTokenExpired;
  private invalidateTokenObject: InvalidateTokenObject;
  private expireAccessToken: ExpireAccessToken;
  private credentialSyncVariables: CredentialSyncVariables;
  private useCredentialSync: boolean;
  private autoCheckTokenExpiryOnRequest: boolean;
  // Prevents concurrent token refreshes by storing active refresh promises in memory
  private static inMemoryLocks = new Map<string, Promise<CurrentTokenObject>>();

  // Creates a unique lock key to identify this specific credential's refresh operation
  private getInMemoryLockKey(): string {
    const resourceId = this.resourceOwner.id || 'anonymous';
    return `oauth:refresh:${this.appSlug}:${this.resourceOwner.type}:${resourceId}`;
  }

  constructor({
    getCurrentTokenObject,
    resourceOwner,
    appSlug,
    currentTokenObject,
    fetchNewTokenObject,
    updateTokenObject,
    /**
     * The fn must not crash. It is the responsibility of the caller to handle any error and appropriately decide what to return
     */
    isTokenObjectUnusable,
    /**
     * The fn must not crash. It is the responsibility of the caller to handle any error and appropriately decide what to return
     */
    isAccessTokenUnusable,
    invalidateTokenObject,
    expireAccessToken,
    credentialSyncVariables,
    autoCheckTokenExpiryOnRequest = true,
    isTokenExpiring = (token: z.infer<typeof OAuth2TokenResponseInDbWhenExistsSchema>) => {
      // TODO: Make this configurable
      // Refresh token 5 seconds early to avoid expired token requests
      const expireThreshold = 5000;
      const isGoingToExpire = getExpiryDate() - expireThreshold <= Date.now();
      log.debug(
        "isTokenExpiring",
        safeStringify({
          isGoingToExpire,
          expiry_date: token.expiry_date,
          expires_in: token.expires_in,
          currentTime: Date.now(),
          expireThreshold,
        })
      );
      return isGoingToExpire;
      function isRelativeToEpoch(relativeTimeInSeconds: number) {
        // Values > 1B seconds (~2001) are likely epoch timestamps, not relative durations
        return relativeTimeInSeconds > 1000000000;
      }

      function getExpiryDate() {
        if (token.expiry_date) {
          return token.expiry_date;
        }
        // Some APIs send relative seconds, others send epoch timestamps (e.g., Office365)
        // We need to detect which format to avoid treating expired tokens as valid
        if (token.expires_in && isRelativeToEpoch(token.expires_in)) {
          return token.expires_in * 1000;
        }
        // Return 0 to mark token as expired (Date.now() will always be greater)
        return 0;
      }
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
    currentTokenObject?: CurrentTokenObject;

    getCurrentTokenObject?: GetCurrentTokenObject;
    /**
     * The unique identifier of the app that the token is for. It is required to do credential syncing in self-hosting
     */
    appSlug: string;

    /**
     *
     * It could be null in case refresh_token isn't available. This is possible when credential sync happens from a third party who doesn't want to share refresh_token and credential syncing has been disabled after the sync has happened.
     * If credential syncing is still enabled `fetchNewTokenObject` wouldn't be called
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
    isTokenExpiring?: IsTokenExpired;
  }) {
    if (!getCurrentTokenObject && !currentTokenObject) {
      throw new Error("One of getCurrentTokenObject or currentTokenObject is required");
    }
    this.resourceOwner = resourceOwner;
    this.currentTokenObject = currentTokenObject ?? null;
    this.getCurrentTokenObject = getCurrentTokenObject ?? null;
    this.appSlug = appSlug;
    this.fetchNewTokenObject = fetchNewTokenObject;
    this.isTokenObjectUnusable = isTokenObjectUnusable;
    this.isAccessTokenUnusable = isAccessTokenUnusable;
    this.isTokenExpiring = isTokenExpiring;
    this.invalidateTokenObject = invalidateTokenObject;
    this.expireAccessToken = expireAccessToken;
    this.credentialSyncVariables = credentialSyncVariables;
    this.useCredentialSync = !!(
      credentialSyncVariables.APP_CREDENTIAL_SHARING_ENABLED &&
      credentialSyncVariables.CREDENTIAL_SYNC_ENDPOINT &&
      credentialSyncVariables.CREDENTIAL_SYNC_SECRET_HEADER_NAME &&
      credentialSyncVariables.CREDENTIAL_SYNC_SECRET
    );

    if (this.useCredentialSync) {
      // Only validate resource owner when credential sync is enabled due to legacy data
      ensureValidResourceOwner(resourceOwner);
    }

    this.autoCheckTokenExpiryOnRequest = autoCheckTokenExpiryOnRequest;
    this.updateTokenObject = updateTokenObject;
  }

  private isResponseNotOkay(response: Response) {
    return !response.ok || response.status < 200 || response.status >= 300;
  }



  /**
   * Gets the current token object as is if not expired.
   * If expired, it refreshes the token and returns the new token object.
   * It also calls the `updateTokenObject` to update the token object in the database if it is changed.
   */
  public async getTokenObjectOrFetch() {
    const myLog = log.getSubLogger({
      prefix: [`getTokenObjectOrFetch:appSlug=${this.appSlug}`],
    });
    let currentTokenObject;
    if (this.currentTokenObject) {
      currentTokenObject = this.currentTokenObject;
    } else if (this.getCurrentTokenObject) {
      this.currentTokenObject = currentTokenObject = await this.getCurrentTokenObject();
    } else {
      throw new Error("Neither currentTokenObject nor getCurrentTokenObject is set");
    }
    const isExpired = await this.isTokenExpiring(currentTokenObject);
    myLog.debug(
      "getTokenObjectOrFetch called",
      safeStringify({
        currentTokenObjectHasAccessToken: !!currentTokenObject.access_token,
        isExpired,
        resourceOwner: this.resourceOwner,
      })
    );

    if (!isExpired) {
      myLog.debug("Token is not expired. Returning the current token object");
      return { token: this.normalizeNewlyReceivedToken(currentTokenObject), isUpdated: false };
    } else {
      // Check if another request is already refreshing this token
      const lockKey = this.getInMemoryLockKey();
      if (OAuthManager.inMemoryLocks.has(lockKey)) {
        myLog.debug("Token refresh already in progress, waiting for completion");
        const refreshedToken = await OAuthManager.inMemoryLocks.get(lockKey)!;
        // Sync our instance with the refreshed token from the other request
        this.currentTokenObject = refreshedToken;
        return { token: this.normalizeNewlyReceivedToken(refreshedToken), isUpdated: true };
      }

      try {
        // Start the refresh and store the promise so other requests can wait for it
        const refreshPromise = this.performTokenRefresh(currentTokenObject);
        OAuthManager.inMemoryLocks.set(lockKey, refreshPromise);

        const token = await refreshPromise;
        
        // Remove the lock now that refresh is complete
        OAuthManager.inMemoryLocks.delete(lockKey);
        
        return { token: this.normalizeNewlyReceivedToken(token), isUpdated: true };
      } catch (error) {
        // Always clean up the lock, even on failure
        OAuthManager.inMemoryLocks.delete(lockKey);
        myLog.error("Error during token refresh", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    }
  }

  private async performTokenRefresh(currentTokenObject: CurrentTokenObject): Promise<CurrentTokenObject> {
    const myLog = log.getSubLogger({
      prefix: [`performTokenRefresh:appSlug=${this.appSlug}`],
    });
    
    const token = {
      // Preserve existing token properties since some APIs don't return all fields (e.g., Google doesn't resend refresh_token)
      ...currentTokenObject,
      ...this.normalizeNewlyReceivedToken(
        await this.refreshOAuthToken({ refreshToken: currentTokenObject.refresh_token ?? null })
      ),
    };
    myLog.debug("Token is expired. So, returning new token object");
    try {
      await this.updateTokenObject(token);
      this.currentTokenObject = token;
      return token;
    } catch (e) {
      myLog.error("Failed to persist refreshed token; leaving in-memory token unchanged", safeStringify(e));
      throw e;
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
        // Convert error to Response object so token validation methods can process it
        response = handleFetchError(e);
      }
    } else {
      this.assertCurrentTokenObjectIsSet();
      const { url, options } = customFetchOrUrlAndOptions;
      const headers = {
        Authorization: `Bearer ${this.currentTokenObject.access_token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      };
      myLog.debug("Sending request using fetch", safeStringify({ customFetchOrUrlAndOptions, headers }));
      // Let fetch errors bubble up since they're usually temporary network issues
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
    } else if (tokenStatus === TokenStatus.INCONCLUSIVE) {
      await this.onInconclusiveResponse();
    }

    // We are done categorizing the token status. Now, we can throw back
    if ("myFetchError" in (json || {})) {
      throw new Error(json.myFetchError);
    }

    return { tokenStatus: tokenStatus, json };
  }

  /**
   * currentTokenObject is set through getTokenObjectOrFetch call
   */
  private assertCurrentTokenObjectIsSet(): asserts this is this & {
    currentTokenObject: CurrentTokenObject;
  } {
    if (!this.currentTokenObject) {
      throw new Error("currentTokenObject is not set");
    }
  }
  /**
   * It doesn't automatically detect the response for tokenObject and accessToken becoming invalid
   * Could be used when you expect a possible non JSON response as well.
   */
  public async requestRaw({ url, options }: { url: string; options: RequestInit }) {
    const myLog = log.getSubLogger({ prefix: ["requestRaw"] });
    myLog.debug("Sending request using fetch", safeStringify({ url, options }));
    if (this.autoCheckTokenExpiryOnRequest) {
      await this.getTokenObjectOrFetch();
    }
    // Either `getTokenObjectOrFetch` has been called through autoCheckTokenExpiryOnRequest or through a direct call to it outside OAuthManager
    // In both cases, `currentTokenObject` is set
    this.assertCurrentTokenObjectIsSet();
    const headers = {
      Authorization: `Bearer ${this.currentTokenObject.access_token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    };

    const response = await fetch(url, {
      method: "GET",
      ...options,
      headers: headers,
    });
    myLog.debug(
      "Response from request",
      safeStringify({
        text: await response.clone().text(),
        status: response.status,
        statusText: response.statusText,
      })
    );
    if (this.isResponseNotOkay(response)) {
      await this.onInconclusiveResponse();
    }
    return response;
  }

  private async onInconclusiveResponse() {
    const myLog = log.getSubLogger({ prefix: ["onInconclusiveResponse"] });
    myLog.debug("Expiring the access token");
    // For credential sync, expire token on unclear errors since tokens have infinite expiry
    // This allows external sync to potentially fix revoked tokens that our validation missed
    if (this.useCredentialSync) {
      await this.expireAccessToken();
    }
  }

  private async invalidate() {
    const myLog = log.getSubLogger({ prefix: ["invalidate"] });
    if (this.useCredentialSync) {
      myLog.debug("Expiring the access token");
      // Don't expire here since token was just refreshed - likely same result
      await this.expireAccessToken();
    } else {
      myLog.debug("Invalidating the token object");
      // Without credential sync, mark token invalid so user can reconnect manually
      await this.invalidateTokenObject();
    }
  }

  private normalizeNewlyReceivedToken(
    token: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>
  ) {
    if (!token.expiry_date && !token.expires_in) {
      // With credential sync: use 1-year expiry (refreshed by external API)
      // Without credential sync: mark as expired to force immediate refresh
      token.expiry_date = this.useCredentialSync ? Date.now() + 365 * 24 * 3600 * 1000 : 0;
    } else if (token.expires_in !== undefined && token.expiry_date === undefined) {
      token.expiry_date = Math.round(Date.now() + token.expires_in * 1000);

      // Remove expires_in since it's relative to "now" and becomes stale when token objects are merged
      delete token.expires_in;
    }
    return token;
  }

  // TODO: On regenerating access_token successfully, we should call makeTokenObjectValid(to counter invalidateTokenObject). This should fix stale banner in UI to reconnect when the connection is working
  private async refreshOAuthToken({ refreshToken }: { refreshToken: string | null }) {
    const myLog = log.getSubLogger({ prefix: ["refreshOAuthToken"] });
    let response;
    if (this.resourceOwner.id && this.useCredentialSync) {
      if (
        !this.credentialSyncVariables.CREDENTIAL_SYNC_SECRET ||
        !this.credentialSyncVariables.CREDENTIAL_SYNC_SECRET_HEADER_NAME ||
        !this.credentialSyncVariables.CREDENTIAL_SYNC_ENDPOINT
      ) {
        throw new Error("Credential syncing is enabled but the required env variables are not set");
      }
      myLog.info(
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
    } else {
      myLog.info(
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

    const clonedResponse = response.clone();
    myLog.info(
      "Response status from refreshOAuthToken",
      safeStringify({
        ok: clonedResponse.ok,
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
      })
    );

    const { json, tokenStatus } = await this.getAndValidateOAuth2Response({
      response,
    });
    if (tokenStatus === TokenStatus.UNUSABLE_TOKEN_OBJECT) {
      await this.invalidateTokenObject();
    } else if (tokenStatus === TokenStatus.UNUSABLE_ACCESS_TOKEN) {
      await this.expireAccessToken();
    }

    if (json && json.myFetchError) {
      // Throw error back as it isn't a valid token response and we can't process it further
      throw new Error(json.myFetchError);
    }
    const parsedToken = OAuth2UniversalSchemaWithCalcomBackwardCompatibility.safeParse(json);
    if (!parsedToken.success) {
      myLog.error(
        "Token parsing error:",
        safeStringify({ issues: parsedToken.error.issues, oauth2response: json, tokenStatus })
      );
      throw new Error("Invalid token response");
    }
    return parsedToken.data;
  }

  private async getAndValidateOAuth2Response({ response }: { response: Response }) {
    const myLog = log.getSubLogger({ prefix: ["getAndValidateOAuth2Response"] });
    const clonedResponse = response.clone();

    // Handle empty responses (like 204 No Content) that would crash JSON.parse()
    if ((await clonedResponse.text()).trim() === "") {
      return { tokenStatus: TokenStatus.VALID, json: null, invalidReason: null } as const;
    }

    const tokenObjectUsabilityRes = await this.isTokenObjectUnusable(response.clone());
    const accessTokenUsabilityRes = await this.isAccessTokenUnusable(response.clone());
    const isNotOkay = this.isResponseNotOkay(response);

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

    // If response isn't OK and wasn't handled by token validation, mark as inconclusive
    // Could be network error or temporary third-party service issue
    if (isNotOkay) {
      return {
        tokenStatus: TokenStatus.INCONCLUSIVE,
        invalidReason: response.statusText,
        json,
      };
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
