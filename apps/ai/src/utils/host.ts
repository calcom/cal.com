import type { NextRequest } from "next/server";

const getHostFromHeaders = (headers: NextRequest["headers"]): string => {
  return `https://${headers.get("host")}`;
};

export default getHostFromHeaders;
