import { serialize } from "cookie";
import { randomBytes } from "crypto";
import type { ServerResponse } from "http";

export const setCsrfToken = (res: ServerResponse) => {
  const token = randomBytes(28).toString("hex");
  res.setHeader(
    "Set-Cookie",
    serialize("csrf_token", token, {
      httpOnly: false, // important for reading cookie on the client
      maxAge: undefined, // expire with session
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })
  );
};
