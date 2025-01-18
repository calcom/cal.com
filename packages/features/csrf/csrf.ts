import type { SerializeOptions } from "cookie";
import { serialize } from "cookie";
import type { IncomingMessage, ServerResponse } from "http";

import type { ICSRF } from "./csrf.interface";

export class RealCSRF implements ICSRF {
  cookieOptions: SerializeOptions;
  constructor() {
    // This will never be null since we would be using MockCSRF otherwise
    this.cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    };
  }
  setup(req: IncomingMessage, res: ServerResponse) {
    const csrfToken = res.getHeader("x-csrf-token") || "missing";
    res.setHeader("Set-Cookie", [serialize("x-csrf-token", `${csrfToken}`, this.cookieOptions)]);
  }
}
