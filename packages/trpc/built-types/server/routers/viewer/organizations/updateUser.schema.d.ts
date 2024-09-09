import { z } from "zod";
export declare const ZUpdateUserInputSchema: z.ZodObject<{
    userId: z.ZodNumber;
    username: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["ADMIN", "MEMBER", "OWNER"]>;
    timeZone: z.ZodString;
    attributeOptions: z.ZodOptional<z.ZodObject<{
        userId: z.ZodNumber;
        attributes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodOptional<z.ZodString>;
                value: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                value: string;
                label?: string | undefined;
            }, {
                value: string;
                label?: string | undefined;
            }>, "many">>;
            value: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            options?: {
                value: string;
                label?: string | undefined;
            }[] | undefined;
            value?: string | undefined;
        }, {
            id: string;
            options?: {
                value: string;
                label?: string | undefined;
            }[] | undefined;
            value?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        userId: number;
        attributes: {
            id: string;
            options?: {
                value: string;
                label?: string | undefined;
            }[] | undefined;
            value?: string | undefined;
        }[];
    }, {
        userId: number;
        attributes: {
            id: string;
            options?: {
                value: string;
                label?: string | undefined;
            }[] | undefined;
            value?: string | undefined;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    userId: number;
    timeZone: string;
    role: "ADMIN" | "MEMBER" | "OWNER";
    username?: string | undefined;
    bio?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
    avatar?: string | undefined;
    attributeOptions?: {
        userId: number;
        attributes: {
            id: string;
            options?: {
                value: string;
                label?: string | undefined;
            }[] | undefined;
            value?: string | undefined;
        }[];
    } | undefined;
}, {
    userId: number;
    timeZone: string;
    role: "ADMIN" | "MEMBER" | "OWNER";
    username?: string | undefined;
    bio?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
    avatar?: string | undefined;
    attributeOptions?: {
        userId: number;
        attributes: {
            id: string;
            options?: {
                value: string;
                label?: string | undefined;
            }[] | undefined;
            value?: string | undefined;
        }[];
    } | undefined;
}>;
export type TUpdateUserInputSchema = z.infer<typeof ZUpdateUserInputSchema>;
