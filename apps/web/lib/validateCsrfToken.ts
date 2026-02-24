import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function validateCsrfToken(csrfToken: string | undefined): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("calcom.csrf_token")?.value;

  if (!csrfToken && !cookieToken) {
    return null;
  }

  if (!cookieToken || cookieToken !== csrfToken) {
    return NextResponse.json({ success: false, message: "Invalid CSRF token" }, { status: 403 });
  }
  cookieStore.delete("calcom.csrf_token");
  return null;
}
