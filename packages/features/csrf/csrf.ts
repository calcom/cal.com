import type { SerializeOptions } from "cookie";
import { parse, serialize } from "cookie";
import { sign, unsign } from "cookie-signature";
import { createHash, randomBytes } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import compare from "tsscmp";
import uid from "uid-safe";

import { HttpError } from "@calcom/lib/http-error";

import type { ICSRF } from "./csrf.interface";

class InvalidCSRFError extends HttpError {
  constructor() {
    super({ statusCode: 403, message: "Invalid CSRF token" });
  }
}

export class RealCSRF implements ICSRF {
  cookieOptions: SerializeOptions;
  secret: string;
  secretCookieName = "csrfSecret";
  tokenCookieName = "XSRF-TOKEN";
  constructor() {
    this.secret = process.env.CSRF_SECRET!;
    this.cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    };
  }
  private hash(str: string) {
    return createHash("sha1")
      .update(str, "ascii")
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }
  private tokenize(secret: string, salt: string) {
    return `${salt}-${this.hash(`${salt}-${secret}`)}`;
  }
  private verifyToken(secret: string, token: string) {
    if (!secret || typeof secret !== "string" || !token || typeof token !== "string") return false;
    const index = token.indexOf("-");
    if (index === -1) return false;
    const salt = token.substr(0, index);
    const expected = this.tokenize(secret, salt);
    return compare(token, expected);
  }
  private createToken(secret: string) {
    if (!secret || typeof secret !== "string") {
      throw new TypeError("argument secret is required");
    }
    const salt = randomBytes(32).toString("hex");

    return this.tokenize(secret, salt);
  }
  private getCookie(req: IncomingMessage, name: string): string {
    if (req.headers.cookie) {
      const parsedCookie = parse(req.headers.cookie);
      return parsedCookie[name] || "";
    }
    return "";
  }
  private getSecret(req: IncomingMessage): string {
    return this.getCookie(req, this.secretCookieName.toLowerCase());
  }
  setup(req: IncomingMessage, res: ServerResponse) {
    const csrfSecret = this.getSecret(req) || uid.sync(18);
    const unsignedToken = this.createToken(csrfSecret);
    const token = this.secret !== null ? sign(unsignedToken, this.secret) : unsignedToken;

    res.setHeader("Set-Cookie", [
      serialize(this.secretCookieName, csrfSecret, this.cookieOptions),
      serialize(this.tokenCookieName, token, this.cookieOptions),
    ]);
  }
  verify(req: IncomingMessage, res: ServerResponse) {
    // Fail if no cookie is present
    if (req.headers?.cookie === undefined) throw new InvalidCSRFError();

    const cookie = parse(req.headers?.cookie);
    // Extract secret and token from their cookies
    let token = cookie[this.tokenCookieName];
    const csrfSecret = cookie[this.secretCookieName];

    // Check token is in the cookie
    if (!token || !csrfSecret) throw new InvalidCSRFError();

    // If user provided a secret, then the cookie is signed.
    // Unsign and verify aka Synchronizer token pattern.
    // https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern
    if (this.secret !== null) {
      // unsign cookie
      const unsignedToken = unsign(token, this.secret);

      // validate signature
      if (!unsignedToken) throw new InvalidCSRFError();

      token = unsignedToken;
    }

    // verify CSRF token
    if (!this.verifyToken(csrfSecret, token)) throw new InvalidCSRFError();

    // If token is verified, generate a new one and save it in the cookie
    const newToken =
      this.secret !== null ? sign(this.createToken(csrfSecret), this.secret) : this.createToken(csrfSecret);
    res.setHeader("Set-Cookie", serialize(this.tokenCookieName, newToken, this.cookieOptions));
  }
}
