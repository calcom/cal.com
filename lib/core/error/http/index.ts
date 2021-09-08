// Base http exception
export { HttpException } from "./http-exception";

// Concrete exceptions

// 1. server errors
export { HttpInternalServerError } from "./http-internal-server-error";
export { HttpNotImplemented } from "./http-not-implemented";
export { HttpServiceUnavailable } from "./http-service-unavailable";
export { HttpBadGateway } from "./http-bad-gateway";
export { HttpGatewayTimeout } from "./http-gateway-timeout";

// 2. client errors
export { HttpForbidden } from "./http-forbidden";
export { HttpNotFound } from "./http-not-found";
export { HttpGoneError } from "./http-gone-error";
export { HttpRequestTimeout } from "./http-request-timeout";
export { HttpUnauthorized } from "./http-unauthorized";
export { HttpBadRequest } from "./http-bad-request";
export { HttpMethodNotAllowed } from "./http-method-not-allowed";
export { HttpUnprocessableEntity } from "./http-unprocessable-entity";
export { HttpBadMapping } from "./http-bad-mapping";
