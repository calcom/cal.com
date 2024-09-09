import z from "zod";
import type { TrpcSessionUser } from "../../../trpc";
export declare const ZListOtherTeamMembersSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodNumber;
    offset: z.ZodOptional<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    limit: number;
    query?: string | undefined;
    offset?: number | undefined;
    cursor?: number | null | undefined;
}, {
    teamId: number;
    limit: number;
    query?: string | undefined;
    offset?: number | undefined;
    cursor?: number | null | undefined;
}>;
export type TListOtherTeamMembersSchema = z.infer<typeof ZListOtherTeamMembersSchema>;
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TListOtherTeamMembersSchema;
};
export declare const listOtherTeamMembers: ({ input }: ListOptions) => Promise<{
    rows: {
        bookerUrl: string;
        user: {
            name: string | null;
            id: number;
            email: string;
            username: string | null;
            avatarUrl: string | null;
        } & {
            nonProfileUsername: string | null;
            profile: import("@calcom/types/UserProfile").UserProfile;
        };
        id: number;
        role: import(".prisma/client").$Enums.MembershipRole;
        disableImpersonation: boolean;
        accepted: boolean;
    }[];
    nextCursor: number | null | undefined;
}>;
export default listOtherTeamMembers;
