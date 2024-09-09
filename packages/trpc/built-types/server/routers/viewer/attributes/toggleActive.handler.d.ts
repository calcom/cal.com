import type { TrpcSessionUser } from "../../../trpc";
import type { ZToggleActiveSchema } from "./toggleActive.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZToggleActiveSchema;
};
declare const toggleActiveHandler: ({ input, ctx }: GetOptions) => Promise<{
    enabled: boolean;
    id: string;
}>;
export default toggleActiveHandler;
