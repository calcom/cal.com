// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpServiceUnavailable extends HttpException {
  static readonly STATUS = 503;
  static readonly MESSAGE = "Service unavailable";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpServiceUnavailable.MESSAGE, ...props, status: HttpServiceUnavailable.STATUS });
    Object.setPrototypeOf(this, HttpServiceUnavailable.prototype);
    this.name = HttpServiceUnavailable.prototype.constructor.name;
  }
}
