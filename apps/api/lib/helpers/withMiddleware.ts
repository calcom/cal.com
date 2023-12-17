import { label } from "next-api-middleware";

import { addRequestId } from "./addRequestid";
import { captureErrors } from "./captureErrors";
import { customPrismaClient } from "./customPrisma";
import { extendRequest } from "./extendRequest";
import {
  HTTP_POST,
  HTTP_DELETE,
  HTTP_PATCH,
  HTTP_GET,
  HTTP_GET_OR_POST,
  HTTP_GET_DELETE_PATCH,
} from "./httpMethods";
import { rateLimitApiKey } from "./rateLimitApiKey";
import { verifyApiKey } from "./verifyApiKey";
import { withPagination } from "./withPagination";

const middleware = {
  HTTP_GET_OR_POST,
  HTTP_GET_DELETE_PATCH,
  HTTP_GET,
  HTTP_PATCH,
  HTTP_POST,
  HTTP_DELETE,
  addRequestId,
  verifyApiKey,
  rateLimitApiKey,
  customPrismaClient,
  extendRequest,
  pagination: withPagination,
  captureErrors,
};

type Middleware = keyof typeof middleware;

const middlewareOrder =
  // The order here, determines the order of execution
  [
    "extendRequest",
    "captureErrors",
    // - Put customPrismaClient before verifyApiKey always.
    "customPrismaClient",
    "verifyApiKey",
    "rateLimitApiKey",
    "addRequestId",
  ] as Middleware[]; // <-- Provide a list of middleware to call automatically

const withMiddleware = label(middleware, middlewareOrder);

export { withMiddleware, middleware, middlewareOrder };
