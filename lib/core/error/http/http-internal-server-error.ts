// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpInternalServerError extends HttpException {
  static readonly STATUS = 500;
  static readonly MESSAGE = "Internal server error";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpInternalServerError.MESSAGE, ...props, status: HttpInternalServerError.STATUS });
    Object.setPrototypeOf(this, HttpInternalServerError.prototype);
    this.name = HttpInternalServerError.prototype.constructor.name;
  }
}
