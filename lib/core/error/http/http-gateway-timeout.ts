// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpGatewayTimeout extends HttpException {
  static readonly STATUS = 504;
  static readonly MESSAGE = "Gateway timeout";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpGatewayTimeout.MESSAGE, ...props, status: HttpGatewayTimeout.STATUS });
    Object.setPrototypeOf(this, HttpGatewayTimeout.prototype);
    this.name = HttpGatewayTimeout.prototype.constructor.name;
  }
}
