import { NextMiddleware } from "next-api-middleware";

export const httpMethod = (
  allowedHttpMethod: "GET" | "POST" | "PATCH" | "DELETE"
): NextMiddleware => {
  return async function (req, res, next) {
    if (req.method === allowedHttpMethod || req.method == "OPTIONS") {
      await next();
    } else {
      res.status(404);
      res.end();
    }
  };
};

export const postOnly = httpMethod("POST");
export const getOnly = httpMethod("GET");
export const patchOnly = httpMethod("PATCH");
export const deleteOnly = httpMethod("DELETE");