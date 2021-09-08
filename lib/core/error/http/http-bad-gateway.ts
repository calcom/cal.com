// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpBadGateway extends HttpException {
  static readonly STATUS = 502;
  static readonly MESSAGE = "Bad gateway";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpBadGateway.MESSAGE, ...props, status: HttpBadGateway.STATUS });
    Object.setPrototypeOf(this, HttpBadGateway.prototype);
    this.name = HttpBadGateway.prototype.constructor.name;
  }
}
