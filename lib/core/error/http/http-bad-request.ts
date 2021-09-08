// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpBadRequest extends HttpException {
  static readonly STATUS = 400;
  static readonly MESSAGE = "Bad request";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpBadRequest.MESSAGE, ...props, status: HttpBadRequest.STATUS });
    Object.setPrototypeOf(this, HttpBadRequest.prototype);
    this.name = HttpBadRequest.prototype.constructor.name;
  }
}
