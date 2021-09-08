// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpUnauthorized extends HttpException {
  static readonly STATUS = 401;
  static readonly MESSAGE = "Unauthorized";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpUnauthorized.MESSAGE, ...props, status: HttpUnauthorized.STATUS });
    Object.setPrototypeOf(this, HttpUnauthorized.prototype);
    this.name = HttpUnauthorized.prototype.constructor.name;
  }
}
