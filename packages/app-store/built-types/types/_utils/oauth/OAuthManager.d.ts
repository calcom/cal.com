/**
 * Manages OAuth2.0 tokens for an app and resourceOwner. It automatically refreshes the token when needed.
 * It is aware of the credential sync endpoint and can sync the token from the third party source.
 * It is unaware of Prisma and App logic. It is just a utility to manage OAuth2.0 tokens with life cycle methods
 *
 * For a recommended usage example, see Zoom VideoApiAdapter.ts
 */
import type { z } from "zod";
import type { AxiosLikeResponseToFetchResponse } from "./AxiosLikeResponseToFetchResponse";
import type { OAuth2UniversalSchema } from "./universalSchema";
import { OAuth2UniversalSchemaWithCalcomBackwardCompatibility } from "./universalSchema";
export declare const enum TokenStatus {
    UNUSABLE_TOKEN_OBJECT = 0,
    UNUSABLE_ACCESS_TOKEN = 1,
    INCONCLUSIVE = 2,
    VALID = 3
}
type ResourceOwner = {
    id: number | null;
    type: "team";
} | {
    id: number | null;
    type: "user";
};
type FetchNewTokenObject = ({ refreshToken }: {
    refreshToken: string | null;
}) => Promise<Response | null>;
type UpdateTokenObject = (token: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>) => Promise<void>;
type isTokenObjectUnusable = (response: Response) => Promise<{
    reason: string;
} | null>;
type isAccessTokenUnusable = (response: Response) => Promise<{
    reason: string;
} | null>;
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
export declare class OAuthManager {
    private currentTokenObject;
    private resourceOwner;
    private appSlug;
    private fetchNewTokenObject;
    private updateTokenObject;
    private isTokenObjectUnusable;
    private isAccessTokenUnusable;
    private isTokenExpired;
    private invalidateTokenObject;
    private expireAccessToken;
    private credentialSyncVariables;
    private useCredentialSync;
    private autoCheckTokenExpiryOnRequest;
    constructor({ resourceOwner, appSlug, currentTokenObject, fetchNewTokenObject, updateTokenObject, isTokenObjectUnusable, isAccessTokenUnusable, invalidateTokenObject, expireAccessToken, credentialSyncVariables, autoCheckTokenExpiryOnRequest, isTokenExpired, }: {
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
    });
    private isResponseNotOkay;
    getTokenObjectOrFetch(): Promise<{
        token: z.objectOutputType<{
            refresh_token: z.ZodOptional<z.ZodString>;
            access_token: z.ZodString;
            token_type: z.ZodOptional<z.ZodString>;
            scope: z.ZodOptional<z.ZodString>;
            expiry_date: z.ZodOptional<z.ZodNumber>;
            expires_in: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough">;
        isUpdated: boolean;
    }>;
    request(arg: {
        url: string;
        options: RequestInit;
    }): Promise<{
        tokenStatus: TokenStatus;
        json: unknown;
    }>;
    request<T>(customFetch: () => Promise<AxiosLikeResponseToFetchResponse<{
        status: number;
        statusText: string;
        data: T;
    }>>): Promise<{
        tokenStatus: TokenStatus;
        json: T;
    }>;
    /**
     * It doesn't automatically detect the response for tokenObject and accessToken becoming invalid
     * Could be used when you expect a possible non JSON response as well.
     */
    requestRaw({ url, options }: {
        url: string;
        options: RequestInit;
    }): Promise<Response>;
    private onInconclusiveResponse;
    private invalidate;
    private normalizeNewlyReceivedToken;
    private refreshOAuthToken;
    private getAndValidateOAuth2Response;
}
export {};
//# sourceMappingURL=OAuthManager.d.ts.map