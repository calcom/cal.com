export class HttpError<TCode extends number = number> extends Error {
  public readonly cause: unknown;
  public readonly statusCode: TCode;
  public readonly message: string;
  public readonly url: string;
  public readonly method: string;

  constructor(opts: { url?: string; method?: string; message?: string; statusCode: TCode; cause?: unknown }) {
    super(opts.message ?? `HTTP Error ${opts.statusCode} `);

    Object.setPrototypeOf(this, HttpError.prototype);
    this.name = HttpError.prototype.constructor.name;

    this.cause = opts.cause;
    this.statusCode = opts.statusCode;
    this.url = opts.url;
    this.method = opts.method;
    this.message = opts.message;

    if (opts.cause instanceof Error && opts.cause.stack) {
      this.stack = opts.cause.stack;
    }
  }

  static errorFactory(request, response: Response) {
    return new HttpError({
      message: response.statusText,
      url: response.url,
      method: request.method,
      statusCode: response.status,
    });
  }
}
