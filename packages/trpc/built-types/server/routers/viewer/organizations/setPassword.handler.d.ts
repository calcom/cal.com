import type { TrpcSessionUser } from "../../../trpc";
import type { TSetPasswordSchema } from "./setPassword.schema";
type UpdateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TSetPasswordSchema;
};
export declare const setPasswordHandler: ({ ctx, input }: UpdateOptions) => Promise<{
    update: boolean;
}>;
export default setPasswordHandler;
