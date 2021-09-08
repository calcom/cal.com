// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpBadMapping extends HttpException {
  static readonly STATUS = 421;
  static readonly MESSAGE = "Bad mapping";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpBadMapping.MESSAGE, ...props, status: HttpBadMapping.STATUS });
    Object.setPrototypeOf(this, HttpBadMapping.prototype);
    this.name = HttpBadMapping.prototype.constructor.name;
  }
}
