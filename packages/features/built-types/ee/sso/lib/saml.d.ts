import type { SAMLSSORecord, OIDCSSORecord } from "@boxyhq/saml-jackson";
export declare const samlDatabaseUrl: string;
export declare const isSAMLLoginEnabled: boolean;
export declare const samlTenantID = "Cal.com";
export declare const samlProductID = "Cal.com";
export declare const samlAudience = "https://saml.cal.com";
export declare const samlPath = "/api/auth/saml/callback";
export declare const oidcPath = "/api/auth/oidc";
export declare const clientSecretVerifier: string;
export declare const hostedCal: boolean;
export declare const tenantPrefix = "team-";
export declare const isSAMLAdmin: (email: string) => boolean;
export declare const canAccess: (user: {
    id: number;
    email: string;
}, teamId: number | null) => Promise<{
    message: string;
    access: boolean;
}>;
export type SSOConnection = (SAMLSSORecord | OIDCSSORecord) & {
    type: string;
    acsUrl: string | null;
    entityId: string | null;
    callbackUrl: string | null;
};
//# sourceMappingURL=saml.d.ts.map