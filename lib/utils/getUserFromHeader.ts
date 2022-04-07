import { NextApiResponse } from "next";

export const getCalcomUserId = (res: NextApiResponse) => res.getHeader("x-calcom-user-id") as number;
