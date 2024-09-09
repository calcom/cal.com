import type { SSOConnection } from "@calcom/features/ee/sso/lib/saml";
import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetInputSchema;
};
export declare const getHandler: ({ ctx, input }: GetOptions) => Promise<SSOConnection | null>;
export {};
