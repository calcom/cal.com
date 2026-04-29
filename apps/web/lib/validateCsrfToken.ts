import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function validateCsrfToken(csrfToken: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("calcom.csrf_token")?.value;

  if (!cookieToken || cookieToken.length !== csrfToken.length) {
    return NextResponse.json({ success: false, message: "Invalid CSRF token" }, { status: 403 });
  }

  const isValid = timingSafeEqual(Buffer.from(cookieToken), Buffer.from(csrfToken));
  if (!isValid) {
    return NextResponse.json({ success: false, message: "Invalid CSRF token" }, { status: 403 });
  }

  cookieStore.delete("calcom.csrf_token");
  return null;
}
