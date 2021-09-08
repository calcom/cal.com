import {
  HttpBadGateway,
  HttpBadMapping,
  HttpBadRequest,
  HttpException,
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
} from "@lib/core/error/http";
import { ServerErrorPayload } from "@lib/core/error/http/http-exception";

/**
 * Utility to map fetch errors to http-exceptions and provide support
 * to add url to the exception message
 *
 * @param e - Error returned by fetch
 * @param url - Url on which the call has been done
 * @param method - Http method used for the call
 * @param unexpectedErrorStatusCode - Default status code if exception is not supported
 * @return HttpException or any supported concrete implementation
 */
export const mapFetchErrorToHttpException = (
  e: Error | HttpException,
  url?: string,
  method?: string,
  errorPayload?: ServerErrorPayload,
  unexpectedErrorStatusCode = 500
): HttpException => {
  if (e instanceof HttpException) {
    let status: number;
    try {
      status = e.status;
    } catch (exception) {
      status = unexpectedErrorStatusCode;
    }
    switch (status) {
      case 400:
        return new HttpBadRequest({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 401:
        return new HttpUnauthorized({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 403:
        return new HttpForbidden({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 404:
        return new HttpNotFound({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 421:
        return new HttpBadMapping({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 422:
        return new HttpUnprocessableEntity({
          url,
          method,
          previousError: e,
          stackTrace: e.stack,
          errorPayload,
        });
      case 405:
        return new HttpMethodNotAllowed({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 408:
        return new HttpRequestTimeout({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 500:
        return new HttpInternalServerError({
          url,
          method,
          previousError: e,
          stackTrace: e.stack,
          errorPayload,
        });
      case 501:
        return new HttpNotImplemented({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 502:
        return new HttpBadGateway({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      case 503:
        return new HttpServiceUnavailable({
          url,
          method,
          previousError: e,
          stackTrace: e.stack,
          errorPayload,
        });
      case 504:
        return new HttpGatewayTimeout({ url, method, previousError: e, stackTrace: e.stack, errorPayload });
      default:
        return new HttpException({
          status: status,
          url,
          method,
          previousError: e,
          stackTrace: e.stack,
          errorPayload,
        });
    }
  }

  // Fallback to
  return new HttpException({
    status: unexpectedErrorStatusCode,
    message: `Unexpected error: ${e.name ?? ""}: ${e.message ?? ""}`,
    url,
    method,
    previousError: e,
    stackTrace: e.stack ?? undefined,
    errorPayload,
  });
};
