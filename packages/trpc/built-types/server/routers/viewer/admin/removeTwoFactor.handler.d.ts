import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminRemoveTwoFactor } from "./removeTwoFactor.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAdminRemoveTwoFactor;
};
declare const removeTwoFactorHandler: ({ input }: GetOptions) => Promise<{
    success: boolean;
    userId: number;
}>;
export default removeTwoFactorHandler;
