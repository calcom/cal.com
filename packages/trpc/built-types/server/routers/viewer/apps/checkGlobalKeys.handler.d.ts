import type { TrpcSessionUser } from "../../../trpc";
import type { CheckGlobalKeysSchemaType } from "./checkGlobalKeys.schema";
type checkForGlobalKeys = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: CheckGlobalKeysSchemaType;
};
export declare const checkForGlobalKeysHandler: ({ input }: checkForGlobalKeys) => Promise<boolean>;
export {};
