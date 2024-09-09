import type { NextApiRequest } from "next";
/**
 * This function is used to create app credentials for either a user or a team
 *
 * @param appData information about the app
 * @param appData.type the app slug
 * @param appData.appId the app slug
 * @param key the keys for the app's credentials
 * @param req the request object from the API call. Used to determine if the credential belongs to a user or a team
 */
declare const createOAuthAppCredential: (appData: {
    type: string;
    appId: string;
}, key: unknown, req: NextApiRequest) => Promise<{
    type: string;
    id: number;
    invalid: boolean | null;
    key: import(".prisma/client").Prisma.JsonValue;
    userId: number | null;
    teamId: number | null;
    subscriptionId: string | null;
    billingCycleStart: number | null;
    appId: string | null;
    paymentStatus: string | null;
}>;
export default createOAuthAppCredential;
//# sourceMappingURL=createOAuthAppCredential.d.ts.map