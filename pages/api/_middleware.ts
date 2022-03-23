import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextApiRequest) {
  // return early if url isn't supposed to be protected
  //   if (!req.url.includes("/protected-url")) {
  //     return NextResponse.next()
  //   }
  console.log(req.headers);
  const session = await getToken({ req, secret: process.env.SECRET });
  // You could also check for any property on the session object,
  // like role === "admin" or name === "John Doe", etc.
  if (!session) {
    return NextResponse.redirect("https://localhost:3002/unauthorized");
  }

  // If user is authenticated, continue.
  return NextResponse.next();
}
