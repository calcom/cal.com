export type JsonType = string | number | boolean | null | { [property: string]: JsonType } | JsonType[];

export type ServerErrorPayload =
  | {
      type: "json";
      content: JsonType;
    }
  | {
      type: "text";
      content: string;
    };

export type HttpExceptionProps = {
  status: number;
  message?: string;
  url?: string;
  method?: string;
  previousError?: Error;
  stackTrace?: string;
  errorPayload?: ServerErrorPayload;
  /** Whether the url is automatically displayed in error message */
  displayUrlInMessage?: boolean;
};

export type CustomExceptionProps = Omit<HttpExceptionProps, "status">;

const defaultProps = {
  displayUrlInMessage: true,
};

/**
 * The base HTTPException class
 */
export class HttpException extends Error {
  public readonly status: number;
  public readonly url?: string;
  public readonly stackTrace: string | null;
  public readonly errorPayload?: ServerErrorPayload;

  public readonly displayUrl: boolean;

  public readonly props: HttpExceptionProps;

  private _previousError!: Error | null;

  private previousErrorMessageUsed: boolean;

  set previousError(previousError: Error | null) {
    this._previousError = previousError;
    if (previousError !== null && !this.previousErrorMessageUsed) {
      this.message = `${this.message}, innerException: ${
        previousError.message.length > 0 ? previousError.message : previousError.name
      }`.trim();
    }
  }

  get previousError() {
    return this._previousError;
  }

  constructor(props: HttpExceptionProps) {
    const fullProps = {
      ...defaultProps,
      ...(props || {}),
    } as const;
    const { status, method, message, url, previousError, stackTrace, displayUrlInMessage, errorPayload } =
      fullProps;
    const extra = `${method ? method.toUpperCase() : "URL"}: ${url ?? "unknown"}`;
    const urlInfo = displayUrlInMessage && url !== undefined ? ` (${extra})` : "";

    if (message === undefined && previousError !== undefined) {
      super(
        `${previousError.message.length > 0 ? previousError.message : previousError.name}`.trim() + urlInfo
      );
      this.previousErrorMessageUsed = true;
    } else {
      super((message ?? "HttpException") + urlInfo);
      this.previousErrorMessageUsed = false;
    }
    Object.setPrototypeOf(this, HttpException.prototype);
    this.name = HttpException.prototype.constructor.name;
    this.status = status;
    this.url = url;
    this.stackTrace = stackTrace ?? previousError?.stack ?? null;
    this.displayUrl = displayUrlInMessage;
    this.props = fullProps;
    this.errorPayload = errorPayload;
    // at the end
    this.previousError = previousError ?? null;
  }

  getName(): string {
    return this.name;
  }

  getHttpStatus(): number {
    return this.status;
  }

  toString(): string {
    return `${this.name} (${this.status}): ${this.message}`.trim();
  }
}
