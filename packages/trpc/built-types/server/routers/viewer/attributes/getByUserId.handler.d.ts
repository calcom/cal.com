import type { AttributeType } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "../../../trpc";
import type { ZGetByUserIdSchema } from "./getByUserId.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZGetByUserIdSchema;
};
type GroupedAttribute = {
    id: string;
    name: string;
    type: AttributeType;
    options: {
        id: string;
        slug: string;
        value: string;
    }[];
};
declare const getByUserIdHandler: ({ input, ctx }: GetOptions) => Promise<GroupedAttribute[]>;
export default getByUserIdHandler;
