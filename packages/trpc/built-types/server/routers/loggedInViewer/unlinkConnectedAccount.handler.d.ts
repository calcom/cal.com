import type { GetServerSidePropsContext, NextApiResponse } from "next";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type UpdateProfileOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        res?: NextApiResponse | GetServerSidePropsContext["res"];
    };
};
declare const unlinkConnectedAccount: ({ ctx }: UpdateProfileOptions) => Promise<{
    message: string;
}>;
export default unlinkConnectedAccount;
