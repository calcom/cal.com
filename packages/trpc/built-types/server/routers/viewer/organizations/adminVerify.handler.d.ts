import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminVerifyInput } from "./adminVerify.schema";
type AdminVerifyOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAdminVerifyInput;
};
export declare const adminVerifyHandler: ({ input }: AdminVerifyOptions) => Promise<{
    ok: boolean;
    message: string;
}>;
export default adminVerifyHandler;
