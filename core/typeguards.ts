import is from '@sindresorhus/is';
import { validate as uuidValidate } from 'uuid';
import { version as uuidVersion } from 'uuid';

export function assertNever(value: never, msg?: string): never {
  throw new Error(isNonEmptyString(msg) ? msg : `Unexpected value: ${value}`);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export type UuidV4 = string;

export function isUuidV4(value: unknown): value is UuidV4 {
  return isString(value) && uuidValidate(value) && uuidVersion(value) === 4;
}

export function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function isParsableNumeric(value: unknown): value is number {
  if (Number.isNaN(value)) {
    return false;
  }
  if (typeof value === 'number') {
    return true;
  }
  return is.numericString(value);
}

export function isParsableSafeInteger(value: unknown): value is number | string {
  const v = typeof value === 'string' && /^-?\d+$/.test(value) ? Number.parseInt(value) : value;
  return isSafeInteger(v);
}

export function isHttpStatusCode(value: unknown): value is number {
  return isSafeInteger(value) && value < 600 && value >= 100;
}

export function isNonEmptyString(value: unknown, trim = true): value is string {
  return typeof value === 'string' && (trim ? value.trim() : value).length > 0;
}

export function isPlainObject<T = unknown>(value: unknown): value is Record<string, T> {
  return is.plainObject<T>(value);
}

export function isEmptyPlainObject<T = unknown>(value: unknown): value is Record<never, T> {
  return isPlainObject<T>(value) && Object.entries(value).length === 0;
}

export function isEmptyArray(value: unknown): value is unknown[] {
  return isArray(value) && value.length === 0;
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return is.array(value);
}
