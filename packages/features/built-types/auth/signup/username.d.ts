import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
export type RequestWithUsernameStatus = NextApiRequest & {
    usernameStatus: {
        /**
         * ```text
         * 200: Username is available
         * 402: Pro username, must be purchased
         * 418: A user exists with that username
         * ```
         */
        statusCode: 200 | 402 | 418;
        requestedUserName: string;
        json: {
            available: boolean;
            premium: boolean;
            message?: string;
            suggestion?: string;
        };
    };
};
export declare const usernameStatusSchema: z.ZodObject<{
    statusCode: z.ZodUnion<[z.ZodLiteral<200>, z.ZodLiteral<402>, z.ZodLiteral<418>]>;
    requestedUserName: z.ZodString;
    json: z.ZodObject<{
        available: z.ZodBoolean;
        premium: z.ZodBoolean;
        message: z.ZodOptional<z.ZodString>;
        suggestion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        available: boolean;
        premium: boolean;
        message?: string | undefined;
        suggestion?: string | undefined;
    }, {
        available: boolean;
        premium: boolean;
        message?: string | undefined;
        suggestion?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    statusCode: 200 | 402 | 418;
    json: {
        available: boolean;
        premium: boolean;
        message?: string | undefined;
        suggestion?: string | undefined;
    };
    requestedUserName: string;
}, {
    statusCode: 200 | 402 | 418;
    json: {
        available: boolean;
        premium: boolean;
        message?: string | undefined;
        suggestion?: string | undefined;
    };
    requestedUserName: string;
}>;
type CustomNextApiHandler<T = unknown> = (req: RequestWithUsernameStatus, res: NextApiResponse<T>) => void | Promise<void>;
declare const usernameHandler: (handler: CustomNextApiHandler) => (req: RequestWithUsernameStatus, res: NextApiResponse) => Promise<void>;
declare const usernameCheck: (usernameRaw: string) => Promise<{
    available: boolean;
    premium: boolean;
    suggestedUsername: string;
}>;
export { usernameHandler, usernameCheck };
//# sourceMappingURL=username.d.ts.map