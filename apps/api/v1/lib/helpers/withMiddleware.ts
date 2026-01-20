import { label } from "next-api-middleware";

import { addRequestId } from "./addRequestid";
import { captureErrors } from "./captureErrors";
import { captureUserId } from "./captureUserId";
import { extendRequest } from "./extendRequest";
import {
  HTTP_DELETE,
  HTTP_GET,
  HTTP_GET_DELETE_PATCH,
  HTTP_GET_OR_POST,
  HTTP_PATCH,
  HTTP_POST,
} from "./httpMethods";
import { rateLimitApiKey } from "./rateLimitApiKey";
import { verifyApiKey } from "./verifyApiKey";
import { verifyCredentialSyncEnabled } from "./verifyCredentialSyncEnabled";
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
  extendRequest,
  pagination: withPagination,
  captureErrors,
  captureUserId,
  verifyCredentialSyncEnabled,
};

type Middleware = keyof typeof middleware;

const middlewareOrder: Middleware[] = [
  "extendRequest",
  "captureErrors",
  "verifyApiKey",
  "rateLimitApiKey",
  "addRequestId",
  "captureUserId",
];

const withMiddleware = label(middleware, middlewareOrder);

export { middleware, middlewareOrder, withMiddleware };
