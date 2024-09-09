import type { TrpcSessionUser } from "../../../trpc";
type GetTeamsHandler = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare function getTeamsHandler({ ctx }: GetTeamsHandler): Promise<{
    name: string;
    id: number;
}[]>;
export default getTeamsHandler;
