// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpNotFound extends HttpException {
  static readonly STATUS = 404;
  static readonly MESSAGE = "Not found";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpNotFound.MESSAGE, ...props, status: HttpNotFound.STATUS });
    Object.setPrototypeOf(this, HttpNotFound.prototype);
    this.name = HttpNotFound.prototype.constructor.name;
  }
}
