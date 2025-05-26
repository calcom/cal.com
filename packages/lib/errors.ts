import { ErrorCode } from "@calcom/lib/errorCodes";

export class ErrorWithCode extends Error {
  code: ErrorCode;
  data?: Record<string, unknown>;
  constructor(code: ErrorCode, message?: string, data?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.data = data;
  }
  static get Factory() {
    return new Proxy(ErrorWithCode, {
      get(_, prop: string) {
        if (prop in ErrorCode) {
          const code = ErrorCode[prop as keyof typeof ErrorCode];
          return (message?: string, data?: Record<string, any>) => new ErrorWithCode(code, message, data);
        }
        throw new Error(`Unknown error code: ${prop}`);
      },
    }) as unknown as Record<
      keyof typeof ErrorCode,
      (message?: string, data?: Record<string, any>) => ErrorWithCode
    >;
  }
}

export function getErrorFromUnknown(cause: unknown): Error & { statusCode?: number; code?: string } {
  if (cause instanceof Error) {
    return cause;
  }
  if (typeof cause === "string") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore https://github.com/tc39/proposal-error-cause
    return new Error(cause, { cause });
  }

  return new Error(`Unhandled error of type '${typeof cause}''`);
}

export async function handleErrorsJson<Type>(response: Response): Promise<Type> {
  // FIXME: I don't know why we are handling gzipped case separately. This should be handled by fetch itself.
  if (response.headers.get("content-encoding") === "gzip") {
    const responseText = await response.text();
    return new Promise((resolve) => resolve(JSON.parse(responseText)));
  }

  if (response.status === 204) {
    return new Promise((resolve) => resolve({} as Type));
  }

  if (!response.ok && (response.status < 200 || response.status >= 300)) {
    response.json().then(console.log);
    throw Error(response.statusText);
  }

  return response.json();
}

export function handleErrorsRaw(response: Response) {
  if (response.status === 204) {
    console.error({ response });
    return "{}";
  }
  if (!response.ok || response.status < 200 || response.status >= 300) {
    response.text().then(console.log);
    throw Error(response.statusText);
  }
  return response.text();
}
