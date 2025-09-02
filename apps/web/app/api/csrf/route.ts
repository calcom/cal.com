import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const token = randomBytes(32).toString("hex");

  const res = NextResponse.json({ csrfToken: token });

  res.cookies.set("calcom.csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res;
}
