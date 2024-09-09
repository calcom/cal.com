import type { TrpcSessionUser } from "../../../trpc";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
declare const listHandler: (opts: GetOptions) => Promise<({
    options: {
        value: string;
        id: string;
        slug: string;
        attributeId: string;
    }[];
} & {
    type: import(".prisma/client").$Enums.AttributeType;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    teamId: number;
    enabled: boolean;
    usersCanEditRelation: boolean;
})[]>;
export default listHandler;
