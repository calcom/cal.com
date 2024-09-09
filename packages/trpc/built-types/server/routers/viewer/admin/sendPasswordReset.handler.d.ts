import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminPasswordResetSchema } from "./sendPasswordReset.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAdminPasswordResetSchema;
};
declare const sendPasswordResetHandler: ({ input }: GetOptions) => Promise<{
    success: boolean;
}>;
export default sendPasswordResetHandler;
