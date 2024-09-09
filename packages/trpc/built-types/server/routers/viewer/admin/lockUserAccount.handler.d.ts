import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminLockUserAccountSchema } from "./lockUserAccount.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAdminLockUserAccountSchema;
};
declare const lockUserAccountHandler: ({ input }: GetOptions) => Promise<{
    success: boolean;
    userId: number;
    locked: boolean;
}>;
export default lockUserAccountHandler;
