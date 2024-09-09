import type { NextApiRequest } from "next";
type CtxOrReq = {
    req: NextApiRequest;
    ctx?: never;
} | {
    ctx: {
        req: NextApiRequest;
    };
    req?: never;
};
export declare const ensureSession: (ctxOrReq: CtxOrReq) => Promise<import("next-auth").Session>;
export {};
//# sourceMappingURL=ensureSession.d.ts.map