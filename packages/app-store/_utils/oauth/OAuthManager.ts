/**
 * Manages OAuth2.0 tokens for an app and resourceOwner. It automatically refreshes the token when needed.
 * It is aware of the credential sync endpoint and can sync the token from the third party source.
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
/**
 * Manages OAuth2.0 tokens for an app and resourceOwner
 * If expiry_date or expires_in isn't provided in token then it is considered expired immediately(if credential sync is not enabled)
 * If credential sync is enabled, the token is considered expired after a year. It is expected to be refreshed by the API request from the credential source(as it knows when the token is expired)
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
      log.debug(
        "isTokenExpired called",
        safeStringify({ expiry_date: token.expiry_date, currentTime: Date.now() })
      );

      return getExpiryDate() <= Date.now();

      function isRelativeToEpoch(relativeTimeInSeconds: number) {
        return relativeTimeInSeconds > 1000000000; // If it is more than 2001-09-09 it can be considered relative to epoch. Also, that is more than 30 years in future which couldn't possibly be relative to current time
      }

      function getExpiryDate() {
        if (token.expiry_date) {
          return token.expiry_date;
        }
        // It is usually in "seconds since now" but due to some integrations logic converting it to "seconds since epoch"(e.g. Office365Calendar has done that) we need to confirm what is the case here.
        // But we for now know that it is in seconds for sure
        // If it is not relative to epoch then it would be wrong to use it as it would make the token as non-expired when it could be expired
        if (token.expires_in && isRelativeToEpoch(token.expires_in)) {
          return token.expires_in * 1000;
        }
        // 0 means it would be expired as Date.now() is greater than that
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
    currentTokenObject: z.infer<typeof OAuth2UniversalSchema>;
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
    isTokenExpired?: IsTokenExpired;
  }) {
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

    if (this.useCredentialSync) {
      // Though it should be validated without credential sync as well but it seems like we have some credentials without userId in production
      // So, we are not validating it for now
      ensureValidResourceOwner(resourceOwner);
    }

    this.autoCheckTokenExpiryOnRequest = autoCheckTokenExpiryOnRequest;
    this.updateTokenObject = updateTokenObject;
  }

  private isResponseNotOkay(response: Response) {
    return !response.ok || response.status < 200 || response.status >= 300;
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
      return { token: this.normalizeNewlyReceivedToken(this.currentTokenObject), isUpdated: false };
    } else {
      const token = {
        // Keep the old token object as it is, as some integrations don't send back all the props e.g. refresh_token isn't sent again by Google Calendar
        // It also allows any other properties set to be retained.
        // Let's not use normalizedCurrentTokenObject here as `normalizeToken` could possible be not idempotent
        ...this.currentTokenObject,
        ...this.normalizeNewlyReceivedToken(await this.refreshOAuthToken()),
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
        "Content-Type": "application/json",
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
   * It doesn't automatically detect the response for tokenObject and accessToken becoming invalid
   * Could be used when you expect a possible non JSON response as well.
   */
  public async requestRaw({ url, options }: { url: string; options: RequestInit }) {
    const myLog = log.getSubLogger({ prefix: ["requestRaw"] });
    myLog.debug("Sending request using fetch", safeStringify({ url, options }));
    if (this.autoCheckTokenExpiryOnRequest) {
      await this.getTokenObjectOrFetch();
    }
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
    // We can't really take any action on inconclusive response
    // But in case of credential sync we should expire the token so that through the sync we can possibly fix the issue by refreshing the token
    // It is important because in that cases tokens have an infinite expiry and it is possible that the token is revoked and isAccessUnusable and isTokenObjectUnusable couldn't detect the issue
    if (this.useCredentialSync) {
      await this.expireAccessToken();
    }
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

  private normalizeNewlyReceivedToken(
    token: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>
  ) {
    if (!token.expiry_date && !token.expires_in) {
      // Use a practically infinite expiry(a year) for when Credential Sync is enabled. Token is expected to be refreshed by the API request from the credential source.
      // If credential sync is not enabled, we should consider the token as expired otherwise the token could be considered valid forever
      token.expiry_date = this.useCredentialSync ? Date.now() + 365 * 24 * 3600 * 1000 : 0;
    } else if (token.expires_in !== undefined && token.expiry_date === undefined) {
      token.expiry_date = Math.round(Date.now() + token.expires_in * 1000);

      // As expires_in could be relative to current time, we can't keep it in the token object as it could endup giving wrong absolute expiry_time if outdated value is used
      // That could happen if we merge token objects which we do
      delete token.expires_in;
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

    const clonedResponse = response.clone();
    myLog.debug(
      "Response from refreshOAuthToken",
      safeStringify({
        text: await clonedResponse.text(),
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
    const parsedToken = OAuth2UniversalSchemaWithCalcomBackwardCompatibility.safeParse(json);
    if (!parsedToken.success) {
      myLog.error("Token parsing error:", safeStringify(parsedToken.error.issues));
      throw new Error("Invalid token response");
    }
    return parsedToken.data;
  }

  private async getAndValidateOAuth2Response({ response }: { response: Response }) {
    const myLog = log.getSubLogger({ prefix: ["getAndValidateOAuth2Response"] });
    const clonedResponse = response.clone();

    // handle empty response (causes crash otherwise on doing json() as "" is invalid JSON) which is valid in some cases like PATCH calls(with 204 response)
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

    // Any handlable not ok response should be handled through isTokenObjectUnusable or isAccessTokenUnusable but if still not handled, we should throw an error
    // So, that the caller can handle it. It could be a network error or some other temporary error from the third party App itself.
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
