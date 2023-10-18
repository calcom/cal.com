import type { NextRequest } from "next/server";

export const POST = async (request: NextRequest) => {
  console.log("req", request);
};
