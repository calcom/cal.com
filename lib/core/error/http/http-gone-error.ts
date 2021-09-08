// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpGoneError extends HttpException {
  static readonly STATUS = 410;
  static readonly MESSAGE = "Gone";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpGoneError.MESSAGE, ...props, status: HttpGoneError.STATUS });
    Object.setPrototypeOf(this, HttpGoneError.prototype);
    this.name = HttpGoneError.prototype.constructor.name;
  }
}
