type HttpErrorOptions<TCode extends number = number> = {
  url?: string;
  method?: string;
  message?: string;
  statusCode: TCode;
  cause?: Error;
};

export class HttpError<TCode extends number = number> extends Error {
  public readonly cause?: Error;
  public readonly statusCode: TCode;
  public readonly message: string;
  public readonly url: string | undefined;
  public readonly method: string | undefined;

  constructor(opts: HttpErrorOptions<TCode>) {
    super(opts.message ?? `HTTP Error ${opts.statusCode} `);

    Object.setPrototypeOf(this, HttpError.prototype);
    this.name = HttpError.prototype.constructor.name;

    this.cause = opts.cause;
    this.statusCode = opts.statusCode;
    this.url = opts.url;
    this.method = opts.method;
    this.message = opts.message ?? `HTTP Error ${opts.statusCode}`;

    if (opts.cause instanceof Error && opts.cause.stack) {
      this.stack = opts.cause.stack;
    }
  }
}

export const createFromRequest = (request: Request, response: Response) =>
  new HttpError({
    message: response.statusText,
    url: response.url,
    method: request.method,
    statusCode: response.status,
  });

export const httpError = (props: HttpErrorOptions) => new HttpError(props);
