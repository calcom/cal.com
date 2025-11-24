/**
 * TeamId Value Object
 *
 * Represents a unique identifier for a team.
 * Provides type safety and validation for team IDs.
 */
export class TeamId {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error("TeamId must be a positive integer");
    }
    this._value = value;
  }

  get value(): number {
    return this._value;
  }

  /**
   * Create TeamId from a number
   */
  static fromNumber(value: number): TeamId {
    return new TeamId(value);
  }

  /**
   * Create TeamId from a string (with validation)
   */
  static fromString(value: string): TeamId {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new Error("TeamId string must be a valid number");
    }
    return new TeamId(numValue);
  }

  /**
   * Check equality with another TeamId
   */
  equals(other: TeamId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }

  toNumber(): number {
    return this._value;
  }
}
