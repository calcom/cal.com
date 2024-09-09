import type z from "zod";
import type { OAuth2UniversalSchemaWithCalcomBackwardCompatibility } from "./universalSchema";
export declare const updateTokenObject: ({ tokenObject, credentialId, }: {
    tokenObject: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>;
    credentialId: number;
}) => Promise<void>;
//# sourceMappingURL=updateTokenObject.d.ts.map