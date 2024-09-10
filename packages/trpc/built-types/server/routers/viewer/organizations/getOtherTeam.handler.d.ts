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
    id: number;
    slug: string | null;
    metadata: import(".prisma/client").Prisma.JsonValue;
    parent: {
        id: number;
        slug: string | null;
    } | null;
    name: string;
    bio: string | null;
    logoUrl: string | null;
    isPrivate: boolean;
}>;
export default getOtherTeamHandler;
