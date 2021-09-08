// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
import { CustomExceptionProps, HttpException } from "./http-exception";

export class HttpUnprocessableEntity extends HttpException {
  static readonly STATUS = 422;
  static readonly MESSAGE = "Unprocessable entity";

  constructor(props: CustomExceptionProps) {
    super({ message: HttpUnprocessableEntity.MESSAGE, ...props, status: HttpUnprocessableEntity.STATUS });
    Object.setPrototypeOf(this, HttpUnprocessableEntity.prototype);
    this.name = HttpUnprocessableEntity.prototype.constructor.name;
  }
}
