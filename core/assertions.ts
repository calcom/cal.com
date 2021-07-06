import { isNonEmptyString, isUuidV4, UuidV4 } from './typeguards';

export function assertNonEmptyString(
  value: unknown,
  msgOrExceptionFactory?: string | (() => Error) | Error,
  /** auto-trim, default true */
  trim?: boolean
): asserts value is string {
  const autoTrim = trim ?? true;
  if (isNonEmptyString(value, autoTrim)) {
    return;
  }
  if (typeof msgOrExceptionFactory === 'string' || msgOrExceptionFactory === undefined) {
    throw new Error(msgOrExceptionFactory || 'Value must be a non empty string!');
  }
  if (msgOrExceptionFactory instanceof Error) {
    throw msgOrExceptionFactory;
  }
  throw msgOrExceptionFactory();
}

export function assertString(
  value: unknown,
  msgOrExceptionFactory?: string | (() => Error) | Error
): asserts value is string {
  if (typeof value === 'string') return;
  if (typeof msgOrExceptionFactory === 'string' || msgOrExceptionFactory === undefined) {
    throw new Error(msgOrExceptionFactory || 'Value must be a string!');
  }
  if (msgOrExceptionFactory instanceof Error) {
    throw msgOrExceptionFactory;
  }
  throw msgOrExceptionFactory();
}

export function assertUuidV4(value: unknown, msg?: string): asserts value is UuidV4 {
  if (isUuidV4(value)) return;
  throw new Error(msg || 'Value must be a valid UUID V4!');
}
