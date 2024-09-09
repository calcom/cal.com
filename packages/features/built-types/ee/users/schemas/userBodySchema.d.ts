import { z } from "zod";
export declare const userBodySchema: z.ZodObject<{
    locale: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, string, {
        label: string;
        value: string;
    }>;
    role: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodEnum<["USER", "ADMIN"]>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: "USER" | "ADMIN";
    }, {
        label: string;
        value: "USER" | "ADMIN";
    }>, "USER" | "ADMIN", {
        label: string;
        value: "USER" | "ADMIN";
    }>;
    weekStart: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, string, {
        label: string;
        value: string;
    }>;
    timeFormat: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: number;
    }, {
        label: string;
        value: number;
    }>, number, {
        label: string;
        value: number;
    }>;
    identityProvider: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodEnum<["CAL", "GOOGLE", "SAML"]>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }, {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }>, "CAL" | "GOOGLE" | "SAML", {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    locale: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, string, {
        label: string;
        value: string;
    }>;
    role: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodEnum<["USER", "ADMIN"]>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: "USER" | "ADMIN";
    }, {
        label: string;
        value: "USER" | "ADMIN";
    }>, "USER" | "ADMIN", {
        label: string;
        value: "USER" | "ADMIN";
    }>;
    weekStart: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, string, {
        label: string;
        value: string;
    }>;
    timeFormat: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: number;
    }, {
        label: string;
        value: number;
    }>, number, {
        label: string;
        value: number;
    }>;
    identityProvider: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodEnum<["CAL", "GOOGLE", "SAML"]>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }, {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }>, "CAL" | "GOOGLE" | "SAML", {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    locale: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, string, {
        label: string;
        value: string;
    }>;
    role: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodEnum<["USER", "ADMIN"]>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: "USER" | "ADMIN";
    }, {
        label: string;
        value: "USER" | "ADMIN";
    }>, "USER" | "ADMIN", {
        label: string;
        value: "USER" | "ADMIN";
    }>;
    weekStart: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, string, {
        label: string;
        value: string;
    }>;
    timeFormat: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: number;
    }, {
        label: string;
        value: number;
    }>, number, {
        label: string;
        value: number;
    }>;
    identityProvider: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodEnum<["CAL", "GOOGLE", "SAML"]>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }, {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }>, "CAL" | "GOOGLE" | "SAML", {
        label: string;
        value: "CAL" | "GOOGLE" | "SAML";
    }>;
}, z.ZodTypeAny, "passthrough">>;
//# sourceMappingURL=userBodySchema.d.ts.map