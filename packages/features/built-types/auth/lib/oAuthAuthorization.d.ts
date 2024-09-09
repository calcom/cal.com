import type { NextApiRequest } from "next";
export default function isAuthorized(req: NextApiRequest, requiredScopes?: string[]): Promise<{
    id: number;
    name: string | null;
    isTeam: boolean;
} | null>;
//# sourceMappingURL=oAuthAuthorization.d.ts.map