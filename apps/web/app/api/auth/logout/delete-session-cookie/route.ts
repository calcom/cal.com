import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  cookieStore.set("next-auth.session-token", "", {
    path: "/",
    expires: new Date(0),
  });

  return NextResponse.json({ success: true });
}
