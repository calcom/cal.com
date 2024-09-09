import type { TrpcSessionUser } from "../../../trpc";
import type { ZCreateAttributeSchema } from "./create.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZCreateAttributeSchema;
};
declare const createAttributesHandler: ({ input, ctx }: GetOptions) => Promise<{
    id: string;
    teamId: number;
    type: import(".prisma/client").$Enums.AttributeType;
    name: string;
    slug: string;
    enabled: boolean;
    usersCanEditRelation: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export default createAttributesHandler;
