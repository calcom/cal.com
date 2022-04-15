import type { NextMiddleware } from "next-api-middleware";
import NextCors from "nextjs-cors";

export const withCors: NextMiddleware = async (req, res, next) => {
  // Run the cors middleware
  // nextjs-cors uses the cors package, so we invite you to check the documentation https://github.com/expressjs/cors
  await NextCors(req, res, {
    // Options
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  });

  // Rest of the API logic
  // Execute the remaining middleware
  await next();
};
