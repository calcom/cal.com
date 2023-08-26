import type { NextRequest } from "next/server";

const host = (headers: NextRequest["headers"]) => `https://${headers.get("host")}`;

export default host;
