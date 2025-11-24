/**
 * WorkflowId Value Object
 *
 * Represents a unique identifier for a workflow.
 * Provides type safety and validation for workflow IDs.
 */
export class WorkflowId {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error("WorkflowId must be a positive integer");
    }
    this._value = value;
  }

  get value(): number {
    return this._value;
  }

  /**
   * Create WorkflowId from a number
   */
  static fromNumber(value: number): WorkflowId {
    return new WorkflowId(value);
  }

  /**
   * Create WorkflowId from a string (with validation)
   */
  static fromString(value: string): WorkflowId {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new Error("WorkflowId string must be a valid number");
    }
    return new WorkflowId(numValue);
  }

  /**
   * Check equality with another WorkflowId
   */
  equals(other: WorkflowId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }

  toNumber(): number {
    return this._value;
  }
}
