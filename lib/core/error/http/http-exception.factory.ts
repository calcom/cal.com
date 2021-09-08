import {
  getHttpExceptionByStatus,
  HttpExceptionClass,
} from "@lib/core/error/http/utils/supported-http-exceptions";
import { HttpException } from "@lib/core/error/http/http-exception";

export class HttpExceptionFactory {
  public static fromStatus(status: number, message: string, url?: string, defaultStatus = 500) {
    let httpExceptionCls: HttpExceptionClass;
    try {
      httpExceptionCls = getHttpExceptionByStatus(status);
    } catch (e) {
      httpExceptionCls = HttpException;
    }
    return new httpExceptionCls({ message, status: httpExceptionCls?.STATUS ?? defaultStatus, url });
  }
}
