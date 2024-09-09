import type logger from "@calcom/lib/logger";
import type { LarkAppKeys } from "./types/LarkCalendar";
export declare const LARK_HOST = "open.larksuite.com";
export declare const getAppKeys: () => Promise<LarkAppKeys>;
export declare const isExpired: (expiryDate: number) => boolean;
export declare function handleLarkError<T extends {
    code: number;
    msg: string;
}>(response: Response, log: typeof logger): Promise<T>;
//# sourceMappingURL=common.d.ts.map