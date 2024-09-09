import type logger from "@calcom/lib/logger";
import type { FeishuAppKeys } from "./types/FeishuCalendar";
export declare const FEISHU_HOST = "open.feishu.cn";
export declare const getAppKeys: () => Promise<FeishuAppKeys>;
export declare const isExpired: (expiryDate: number) => boolean;
export declare function handleFeishuError<T extends {
    code: number;
    msg: string;
}>(response: Response, log: typeof logger): Promise<T>;
//# sourceMappingURL=common.d.ts.map