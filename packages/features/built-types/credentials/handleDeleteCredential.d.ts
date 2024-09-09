import type { Prisma } from "@prisma/client";
declare const handleDeleteCredential: ({ userId, userMetadata, credentialId, teamId, }: {
    userId: number;
    userMetadata: Prisma.JsonValue;
    credentialId: number;
    teamId?: number | undefined;
}) => Promise<void>;
export default handleDeleteCredential;
//# sourceMappingURL=handleDeleteCredential.d.ts.map