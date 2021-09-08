// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpRequestTimeout extends HttpException {
  static readonly STATUS = 408;
  static readonly MESSAGE = "Request timeout";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpRequestTimeout.MESSAGE, ...props, status: HttpRequestTimeout.STATUS });
    Object.setPrototypeOf(this, HttpRequestTimeout.prototype);
    this.name = HttpRequestTimeout.prototype.constructor.name;
  }
}
