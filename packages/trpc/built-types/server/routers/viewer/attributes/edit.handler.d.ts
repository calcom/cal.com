import type { TrpcSessionUser } from "../../../trpc";
import type { ZEditAttributeSchema } from "./edit.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZEditAttributeSchema;
};
declare const editAttributesHandler: ({ input, ctx }: GetOptions) => Promise<{
    id: string;
}>;
export default editAttributesHandler;
