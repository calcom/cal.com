import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGetVerifiedNumbersInputSchema } from "./getVerifiedNumbers.schema";
type GetVerifiedNumbersOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetVerifiedNumbersInputSchema;
};
export declare const getVerifiedNumbersHandler: ({ ctx, input }: GetVerifiedNumbersOptions) => Promise<{
    id: number;
    userId: number | null;
    teamId: number | null;
    phoneNumber: string;
}[]>;
export {};
