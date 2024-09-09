import type { TrpcSessionUser } from "../../../trpc";
type ListWithTeamOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listWithTeamHandler: ({ ctx }: ListWithTeamOptions) => Promise<{
    team: {
        name: string;
        id: number;
    } | null;
    id: number;
    title: string;
    slug: string;
}[]>;
export {};
