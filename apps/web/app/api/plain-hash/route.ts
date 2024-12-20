import { createHmac } from "crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return new Response("Email is required", { status: 400 });
  }

  const secret = process.env.PLAIN_CHAT_HMAC_SECRET_KEY;
  if (!secret) {
    return new Response("Missing Plain Chat secret", { status: 500 });
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(email.toLowerCase().trim());
  const hash = hmac.digest("hex");

  return NextResponse.json({ hash });
}
