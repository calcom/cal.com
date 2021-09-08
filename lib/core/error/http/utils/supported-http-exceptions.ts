import {
  HttpException,
  HttpBadGateway,
  HttpBadMapping,
  HttpBadRequest,
  HttpForbidden,
  HttpGatewayTimeout,
  HttpInternalServerError,
  HttpMethodNotAllowed,
  HttpNotFound,
  HttpNotImplemented,
  HttpRequestTimeout,
  HttpServiceUnavailable,
  HttpUnauthorized,
  HttpUnprocessableEntity,
} from "@lib/core/error/http/index";

export const supportedClientHttpExceptions = [
  HttpNotFound,
  HttpUnauthorized,
  HttpRequestTimeout,
  HttpMethodNotAllowed,
  HttpForbidden,
  HttpBadRequest,
  HttpUnprocessableEntity,
  HttpBadMapping,
];

export const supportedServerHttpExceptions = [
  HttpInternalServerError,
  HttpNotImplemented,
  HttpServiceUnavailable,
  HttpGatewayTimeout,
  HttpBadGateway,
];

export const supportedHttpExceptions = [...supportedServerHttpExceptions, ...supportedClientHttpExceptions];

export type HttpExceptionClass = typeof HttpException & { STATUS?: number };

/**
 * @throws Error is exception cannot be found
 */
export const getHttpExceptionByName = (name: string): HttpExceptionClass => {
  if (name === "HttpException") {
    return HttpException;
  }
  const found = supportedHttpExceptions.filter(
    (exception) => (exception.prototype?.constructor?.name ?? "") === name
  );
  if (found.length !== 1) {
    throw new Error(`HttpException '${name}' does not exists`);
  }

  if ((found[0]?.name ?? "") === "") {
    throw new Error(`HttpException '${name}' exists but seems to returned an invalid object`);
  }
  return found[0] as unknown as HttpExceptionClass;
};

export const getHttpExceptionByStatus = (status: number): HttpExceptionClass => {
  const found = supportedHttpExceptions.filter((exception) => {
    return exception?.STATUS === status;
  });
  if (found.length !== 1) {
    throw new Error(`HttpException status '${status}' does not exists`);
  }
  const name = found[0]?.name ?? "";
  if (name === "") {
    throw new Error(`HttpException for status '${status}' exists but seems to returned an invalid object`);
  }
  return found[0] as unknown as HttpExceptionClass;
};
