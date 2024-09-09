import { z } from "zod";
export declare const ZChangeMemberRoleInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    memberId: z.ZodNumber;
    role: z.ZodNativeEnum<{
        readonly MEMBER: "MEMBER";
        readonly ADMIN: "ADMIN";
        readonly OWNER: "OWNER";
    }>;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    role: "ADMIN" | "MEMBER" | "OWNER";
    memberId: number;
}, {
    teamId: number;
    role: "ADMIN" | "MEMBER" | "OWNER";
    memberId: number;
}>;
export type TChangeMemberRoleInputSchema = z.infer<typeof ZChangeMemberRoleInputSchema>;
