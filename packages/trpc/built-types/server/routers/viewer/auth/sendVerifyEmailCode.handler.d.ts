import type { TRPCContext } from "../../../createContext";
import type { TSendVerifyEmailCodeSchema } from "./sendVerifyEmailCode.schema";
type SendVerifyEmailCode = {
    input: TSendVerifyEmailCodeSchema;
    req: TRPCContext["req"] | undefined;
};
export declare const sendVerifyEmailCodeHandler: ({ input, req }: SendVerifyEmailCode) => Promise<{
    ok: boolean;
    skipped: boolean;
}>;
export {};
