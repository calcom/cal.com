import type { NextApiRequest, NextApiResponse } from "next";
export type VitalSettingsResponse = {
    connected: boolean;
    sleepValue: number;
    selectedParam: string;
};
declare const _default: (req: NextApiRequest, res: NextApiResponse<any>) => Promise<void | NextApiResponse<any>>;
export default _default;
//# sourceMappingURL=save.d.ts.map