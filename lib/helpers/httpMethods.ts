import { NextMiddleware } from "next-api-middleware";

export const httpMethod = (allowedHttpMethod: "GET" | "POST" | "PATCH" | "DELETE"): NextMiddleware => {
  return async function (req, res, next) {
    if (req.method === allowedHttpMethod || req.method == "OPTIONS") {
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
