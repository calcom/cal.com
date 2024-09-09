import type { NextApiRequest, NextApiResponse } from "next";
export declare const selectOOOEntries: {
    id: boolean;
    start: boolean;
    end: boolean;
    createdAt: boolean;
    updatedAt: boolean;
    notes: boolean;
    reason: {
        select: {
            reason: boolean;
            emoji: boolean;
        };
    };
    reasonId: boolean;
    user: {
        select: {
            id: boolean;
            name: boolean;
            email: boolean;
            timeZone: boolean;
        };
    };
    toUser: {
        select: {
            id: boolean;
            name: boolean;
            email: boolean;
            timeZone: boolean;
        };
    };
    uuid: boolean;
};
declare const _default: (req: NextApiRequest, res: NextApiResponse<any>) => Promise<void>;
export default _default;
//# sourceMappingURL=listOOOEntries.d.ts.map