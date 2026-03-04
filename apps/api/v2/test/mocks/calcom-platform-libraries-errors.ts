// Mock for @calcom/platform-libraries/errors

export const ErrorCode = {};

export class ErrorWithCode extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message);
    this.code = code;
  }
}

export const getHttpStatusCode = jest.fn(() => 500);

export class HttpError extends Error {
  statusCode: number;
  constructor(opts: { statusCode: number; message: string }) {
    super(opts.message);
    this.statusCode = opts.statusCode;
  }
}
