import type { TrpcSessionUser } from "../../../trpc";
import type { ZGetAttributeSchema } from "./get.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZGetAttributeSchema;
};
declare const getAttributeHandler: ({ input, ctx }: GetOptions) => Promise<{
    options: {
        value: string;
        id?: string | undefined;
        assignedUsers?: number | undefined;
    }[];
    type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
    id: string;
    name: string;
}>;
export default getAttributeHandler;
