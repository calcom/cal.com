// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpNotImplemented extends HttpException {
  static readonly STATUS = 501;
  static readonly MESSAGE = "Not implemented";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpNotImplemented.MESSAGE, ...props, status: HttpNotImplemented.STATUS });
    Object.setPrototypeOf(this, HttpNotImplemented.prototype);
    this.name = HttpNotImplemented.prototype.constructor.name;
  }
}
