import type { z } from "zod";

import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { AxiosLikeResponseToFetchResponse } from "./AxiosLikeResponseToFetchResponse";
import type { OAuth2TokenResponseInDbWhenExistsSchema, OAuth2UniversalSchema } from "./universalSchema";
import { OAuth2UniversalSchemaWithCalcomBackwardCompatibility } from "./universalSchema";

const log = logger.getSubLogger({ prefix: ["app-store/_utils/oauth/OAuthManager"] });
const isCredentialSyncingEnabled =
  APP_CREDENTIAL_SHARING_ENABLED &&
  CREDENTIAL_SYNC_ENDPOINT &&
  CREDENTIAL_SYNC_SECRET_HEADER_NAME &&
  CREDENTIAL_SYNC_SECRET;

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

type DoesResponseInvalidateToken = (response: Response) => Promise<{ reason: string } | null>;
type IsTokenExpired = (token: z.infer<typeof OAuth2UniversalSchema>) => Promise<boolean> | boolean;
type InvalidateTokenObject = () => Promise<void>;
type ExpireAccessToken = () => Promise<void>;

/**
 * Manages OAuth2.0 tokens for an app and resourceOwner
 */
export class OAuthManager {
  currentTokenObject: z.infer<typeof OAuth2UniversalSchema>;
  resourceOwner: ResourceOwner;
  appSlug: string;
  fetchNewTokenObject: FetchNewTokenObject;
  doesResponseInvalidateToken: DoesResponseInvalidateToken;
  isTokenExpired: IsTokenExpired;
  invalidateTokenObject: InvalidateTokenObject;
  expireAccessToken: ExpireAccessToken;

  constructor({
    resourceOwner,
    appSlug,
    currentTokenObject,
    fetchNewTokenObject,
    doesResponseInvalidateToken,
    invalidateTokenObject,
    expireAccessToken,
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
     * @param response
     * @returns
     */
    doesResponseInvalidateToken: DoesResponseInvalidateToken;
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
     * Handler to invalidate the token object. It is called when the token object is invalid and credential syncing is disabled
     */
    invalidateTokenObject: InvalidateTokenObject;
    /*
     * Handler to expire the access token. It is called when credential syncing is enabled and when the token object expires
     */
    expireAccessToken: ExpireAccessToken;
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
    this.doesResponseInvalidateToken = doesResponseInvalidateToken;
    this.isTokenExpired = isTokenExpired;
    this.invalidateTokenObject = invalidateTokenObject;
    this.expireAccessToken = expireAccessToken;
  }

  public async getTokenObjectOrFetch() {
    const myLog = log.getSubLogger({
      prefix: ["getTokenObjectOrFetch"],
    });
    const isExpired = await this.isTokenExpired(this.currentTokenObject);
    myLog.debug(
      "getTokenObjectOrFetch called",
      safeStringify({
        isExpired,
        appSlug: this.appSlug,
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
      return { token, isUpdated: true };
    }
  }

  public async request(arg: { url: string; options: RequestInit }): Promise<{
    isTokenInvalid: boolean;
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
    isTokenInvalid: boolean;
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
    if (typeof customFetchOrUrlAndOptions === "function") {
      myLog.debug("Sending request using customFetch");
      const customFetch = customFetchOrUrlAndOptions;
      try {
        response = await customFetch();
      } catch (e) {
        this.invalidate();
        return {
          isTokenInvalid: true,
          json: null,
        };
      }
    } else {
      const { url, options } = customFetchOrUrlAndOptions;
      const headers = {
        Authorization: `Bearer ${this.currentTokenObject.access_token}`,
        ...options?.headers,
      };
      myLog.debug("Sending request using fetch", safeStringify({ customFetchOrUrlAndOptions, headers }));
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

    const { isInvalid, json } = await this.getAndValidateOAuth2Response<T>({
      response,
    });
    if (isInvalid) {
      myLog.error("Token Object has become invalid");
      // In case of Credential Sync, we expire the token so that through the sync we can refresh the token
      // TODO: We should consider sending a special 'reason' query param to toke sync endpoint to convey the reason for getting token
      await this.invalidate();
    }
    return { isTokenInvalid: isInvalid, json };
  }

  private async invalidate() {
    const myLog = log.getSubLogger({ prefix: ["invalidate"] });
    if (isCredentialSyncingEnabled) {
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

  private async refreshOAuthToken() {
    const myLog = log.getSubLogger({ prefix: ["refreshOAuthToken"] });
    let response;
    const refreshToken = this.currentTokenObject.refresh_token ?? null;
    if (this.resourceOwner.id && isCredentialSyncingEnabled) {
      if (!CREDENTIAL_SYNC_SECRET || !CREDENTIAL_SYNC_SECRET_HEADER_NAME || !CREDENTIAL_SYNC_ENDPOINT) {
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
        response = await fetch(`${CREDENTIAL_SYNC_ENDPOINT}?reason=refresh`, {
          method: "POST",
          headers: {
            [CREDENTIAL_SYNC_SECRET_HEADER_NAME]: CREDENTIAL_SYNC_SECRET,
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
      response = await this.fetchNewTokenObject({ refreshToken });
      if (!response) {
        throw new Error("Could not refresh the token");
      }
    }

    const { json, isInvalid } = await this.getAndValidateOAuth2Response({
      response,
    });
    if (isInvalid) {
      await this.invalidateTokenObject();
    }
    const parsedToken = OAuth2UniversalSchemaWithCalcomBackwardCompatibility.safeParse(json);
    if (!parsedToken.success) {
      myLog.error("Token parsing error:", safeStringify(parsedToken.error.issues));
      throw new Error("Invalid token response");
    }
    return parsedToken.data;
  }

  private async getAndValidateOAuth2Response<T>({ response }: { response: Response }) {
    const res = await this.doesResponseInvalidateToken(response.clone());
    if (res?.reason) {
      return { isInvalid: true, invalidReason: res.reason, json: null } as const;
    }

    if (!response.ok || (response.status < 200 && response.status >= 300)) {
      throw new Error(response.statusText);
    }

    // handle 204 response code with empty response (causes crash otherwise as "" is invalid JSON)
    if (response.status === 204) {
      return { isInvalid: false, json: null, invalidReason: null } as const;
    }
    const json = (await response.json()) as T;

    return { isInvalid: false, json: json, invalidReason: null } as const;
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
