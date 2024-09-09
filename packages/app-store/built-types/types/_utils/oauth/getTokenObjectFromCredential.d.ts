import type { CredentialPayload } from "@calcom/types/Credential";
export declare function getTokenObjectFromCredential(credential: CredentialPayload): import("zod").objectOutputType<{
    refresh_token: import("zod").ZodOptional<import("zod").ZodString>;
    access_token: import("zod").ZodString;
    token_type: import("zod").ZodOptional<import("zod").ZodString>;
    scope: import("zod").ZodOptional<import("zod").ZodString>;
    expiry_date: import("zod").ZodOptional<import("zod").ZodNumber>;
    expires_in: import("zod").ZodOptional<import("zod").ZodNumber>;
}, import("zod").ZodTypeAny, "passthrough">;
//# sourceMappingURL=getTokenObjectFromCredential.d.ts.map