import type { NextRequest } from "next/server";

export const readRawBody = async (request: NextRequest): Promise<string> => {
  return await request.text();
};
