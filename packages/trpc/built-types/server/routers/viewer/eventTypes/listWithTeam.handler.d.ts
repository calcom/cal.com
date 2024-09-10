import type { TrpcSessionUser } from "../../../trpc";
type ListWithTeamOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listWithTeamHandler: ({ ctx }: ListWithTeamOptions) => Promise<{
    id: number;
    title: string;
    slug: string;
    team: {
        id: number;
        name: string;
    } | null;
}[]>;
export {};
