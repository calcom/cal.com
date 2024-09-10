import type { TrpcSessionUser } from "../../../trpc";
type GetTeamsHandler = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare function getTeamsHandler({ ctx }: GetTeamsHandler): Promise<{
    id: number;
    name: string;
}[]>;
export default getTeamsHandler;
