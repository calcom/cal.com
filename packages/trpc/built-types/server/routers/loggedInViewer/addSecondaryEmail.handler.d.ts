import type { GetServerSidePropsContext, NextApiResponse } from "next";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TAddSecondaryEmailInputSchema } from "./addSecondaryEmail.schema";
type AddSecondaryEmailOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        res?: NextApiResponse | GetServerSidePropsContext["res"];
    };
    input: TAddSecondaryEmailInputSchema;
};
export declare const addSecondaryEmailHandler: ({ ctx, input }: AddSecondaryEmailOptions) => Promise<{
    data: {
        id: number;
        userId: number;
        email: string;
        emailVerified: Date | null;
    };
    message: string;
}>;
export {};
