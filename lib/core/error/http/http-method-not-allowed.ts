// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpMethodNotAllowed extends HttpException {
  static readonly STATUS = 405;
  static readonly MESSAGE = "Method not allowed";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpMethodNotAllowed.MESSAGE, ...props, status: HttpMethodNotAllowed.STATUS });
    Object.setPrototypeOf(this, HttpMethodNotAllowed.prototype);
    this.name = HttpMethodNotAllowed.prototype.constructor.name;
  }
}
