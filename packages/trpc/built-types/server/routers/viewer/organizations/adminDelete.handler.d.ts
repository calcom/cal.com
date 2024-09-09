import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminDeleteInput } from "./adminDelete.schema";
type AdminDeleteOption = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAdminDeleteInput;
};
export declare const adminDeleteHandler: ({ input }: AdminDeleteOption) => Promise<{
    ok: boolean;
    message: string;
}>;
export default adminDeleteHandler;
