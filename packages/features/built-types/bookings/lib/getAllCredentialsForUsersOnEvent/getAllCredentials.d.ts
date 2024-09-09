import type z from "zod";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { CredentialPayload } from "@calcom/types/Credential";
/**
 * Gets credentials from the user, team, and org if applicable
 *
 */
export declare const getAllCredentials: (user: {
    id: number;
    username: string | null;
    credentials: CredentialPayload[];
}, eventType: {
    userId?: number | null;
    team?: {
        id: number | null;
        parentId: number | null;
    } | null;
    parentId?: number | null;
    metadata: z.infer<typeof EventTypeMetaDataSchema>;
} | null) => Promise<{
    invalid: boolean | null;
    type: string;
    id: number;
    key: import(".prisma/client").Prisma.JsonValue;
    user: {
        email: string;
    } | null;
    userId: number | null;
    teamId: number | null;
    appId: string | null;
}[]>;
//# sourceMappingURL=getAllCredentials.d.ts.map