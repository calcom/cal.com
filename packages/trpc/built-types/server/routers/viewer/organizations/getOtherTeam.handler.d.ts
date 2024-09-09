import { z } from "zod";
import type { TrpcSessionUser } from "../../../trpc";
export declare const ZGetOtherTeamInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    teamId: number;
}, {
    teamId: number;
}>;
export type TGetOtherTeamInputSchema = z.infer<typeof ZGetOtherTeamInputSchema>;
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetOtherTeamInputSchema;
};
export declare const getOtherTeamHandler: ({ input }: GetOptions) => Promise<{
    safeBio: string;
    name: string;
    id: number;
    metadata: import(".prisma/client").Prisma.JsonValue;
    slug: string | null;
    parent: {
        id: number;
        slug: string | null;
    } | null;
    logoUrl: string | null;
    bio: string | null;
    isPrivate: boolean;
}>;
export default getOtherTeamHandler;
