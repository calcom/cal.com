import { HttpError } from "@calcom/lib/http-error";

/** Just a shorthand for HttpError  */
export class HttpCode extends HttpError {
  constructor(statusCode: number, message: string) {
    super({ statusCode, message });
  }
}
