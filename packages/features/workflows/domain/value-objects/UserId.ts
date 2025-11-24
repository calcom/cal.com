/**
 * UserId Value Object
 *
 * Represents a unique identifier for a user.
 * Provides type safety and validation for user IDs.
 */
export class UserId {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error("UserId must be a positive integer");
    }
    this._value = value;
  }

  get value(): number {
    return this._value;
  }

  /**
   * Create UserId from a number
   */
  static fromNumber(value: number): UserId {
    return new UserId(value);
  }

  /**
   * Create UserId from a string (with validation)
   */
  static fromString(value: string): UserId {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new Error("UserId string must be a valid number");
    }
    return new UserId(numValue);
  }

  /**
   * Check equality with another UserId
   */
  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }

  toNumber(): number {
    return this._value;
  }
}
