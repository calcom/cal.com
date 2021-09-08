// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpForbidden extends HttpException {
  static readonly STATUS = 403;
  static readonly MESSAGE = "Forbidden";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpForbidden.MESSAGE, ...props, status: HttpForbidden.STATUS });
    Object.setPrototypeOf(this, HttpForbidden.prototype);
    this.name = HttpForbidden.prototype.constructor.name;
  }
}
