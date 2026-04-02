import type { NextMiddleware } from "next-api-middleware";

export const httpMethod = (allowedHttpMethod: "GET" | "POST" | "PATCH" | "DELETE"): NextMiddleware => {
  return async (req, res, next) => {
    if (req.method === allowedHttpMethod || req.method == "OPTIONS") {
      await next();
    } else {
      res.status(405).json({ message: `Only ${allowedHttpMethod} Method allowed` });
      res.end();
    }
  };
};
// Made this so we can support several HTTP Methods in one route and use it there.
// Could be further extracted into a third function or refactored into one.
// that checks if it's just a string or an array and apply the correct logic to both cases.
export const httpMethods = (allowedHttpMethod: string[]): NextMiddleware => {
  return async (req, res, next) => {
    if (allowedHttpMethod.some((method) => method === req.method || req.method == "OPTIONS")) {
      await next();
    } else {
      res.status(405).json({ message: `Only ${allowedHttpMethod} Method allowed` });
      res.end();
    }
  };
};

export const HTTP_POST = httpMethod("POST");
export const HTTP_GET = httpMethod("GET");
export const HTTP_PATCH = httpMethod("PATCH");
export const HTTP_DELETE = httpMethod("DELETE");
export const HTTP_GET_DELETE_PATCH = httpMethods(["GET", "DELETE", "PATCH"]);
export const HTTP_GET_OR_POST = httpMethods(["GET", "POST"]);
