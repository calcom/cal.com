import type { TrpcSessionUser } from "../../../trpc";
import type { ZDeleteAttributeSchema } from "./delete.schema";
type DeleteOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZDeleteAttributeSchema;
};
declare const deleteAttributeHandler: ({ input, ctx }: DeleteOptions) => Promise<{
    type: import(".prisma/client").$Enums.AttributeType;
    id: string;
    slug: string;
    teamId: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    usersCanEditRelation: boolean;
}>;
export default deleteAttributeHandler;
