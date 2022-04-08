import { NextApiResponse } from "next";

export const getCalcomUserId = (res: NextApiResponse): number => res.getHeader("x-calcom-user-id") as number;
