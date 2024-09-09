import { z } from "zod";
export declare const ZInviteMemberInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    usernameOrEmail: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        email: z.ZodString;
        role: z.ZodNativeEnum<{
            readonly MEMBER: "MEMBER";
            readonly ADMIN: "ADMIN";
            readonly OWNER: "OWNER";
        }>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    }, {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    }>]>, "many">]>, string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[], string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[]>, string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[], string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[]>, string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[], string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[]>;
    role: z.ZodOptional<z.ZodNativeEnum<{
        readonly MEMBER: "MEMBER";
        readonly ADMIN: "ADMIN";
        readonly OWNER: "OWNER";
    }>>;
    language: z.ZodString;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    language: string;
    usernameOrEmail: (string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[]) & (string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[] | undefined);
    role?: "ADMIN" | "MEMBER" | "OWNER" | undefined;
}, {
    teamId: number;
    language: string;
    usernameOrEmail: (string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[]) & (string | (string | {
        email: string;
        role: "ADMIN" | "MEMBER" | "OWNER";
    })[] | undefined);
    role?: "ADMIN" | "MEMBER" | "OWNER" | undefined;
}>;
export type TInviteMemberInputSchema = z.infer<typeof ZInviteMemberInputSchema>;
