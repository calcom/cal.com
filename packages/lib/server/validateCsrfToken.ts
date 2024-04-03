import type { NextApiRequest, NextApiResponse } from "next";

// import { getCsrfToken } from "next-auth/react";
import { PREFIXED_NEXTAUTH_CSRF_COOKIE_NAME } from "../default-cookies";
import { HttpError } from "../http-error";

type Handler<T> = (req: NextApiRequest, res: NextApiResponse) => Promise<T> | T;

export const validateCsrfToken =
  <T>(handler: Handler<T>) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    // FIXME: Find a better way to handle this, we can't trust only the client cookies.
    //  But it's better than nothing. This was returning undefined.
    // const csrfToken = getCsrfToken({ req });
    const csrfToken = req.body.csrfToken as string;
    if (!csrfToken) throw new HttpError({ statusCode: 422, message: "CSRF token missing" });
    const reqCsrfToken = req.cookies[PREFIXED_NEXTAUTH_CSRF_COOKIE_NAME];
    if (!reqCsrfToken) throw new HttpError({ statusCode: 422, message: "CSRF token missing" });
    // Bail out if user's csrf cookie doesn't match session token
    if (reqCsrfToken.split("|")?.[0] !== csrfToken)
      throw new HttpError({ statusCode: 422, message: "Invalid CSRF token" });
    return handler(req, res);
  };
