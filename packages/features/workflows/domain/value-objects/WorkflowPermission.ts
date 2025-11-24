/**
 * WorkflowPermission Value Object
 *
 * Represents the permissions a user has on a workflow.
 * This is an immutable value object that encapsulates permission logic.
 */
export class WorkflowPermission {
  private readonly _canView: boolean;
  private readonly _canUpdate: boolean;
  private readonly _canDelete: boolean;

  constructor(canView: boolean, canUpdate: boolean, canDelete: boolean) {
    this._canView = canView;
    this._canUpdate = canUpdate;
    this._canDelete = canDelete;
  }

  get canView(): boolean {
    return this._canView;
  }

  get canUpdate(): boolean {
    return this._canUpdate;
  }

  get canDelete(): boolean {
    return this._canDelete;
  }

  get readOnly(): boolean {
    return !this._canUpdate;
  }

  /**
   * Create a permission object with no access
   */
  static noAccess(): WorkflowPermission {
    return new WorkflowPermission(false, false, false);
  }

  /**
   * Create a permission object with full access (owner permissions)
   */
  static fullAccess(): WorkflowPermission {
    return new WorkflowPermission(true, true, true);
  }

  /**
   * Create a permission object with read-only access
   */
  static readOnly(): WorkflowPermission {
    return new WorkflowPermission(true, false, false);
  }

  /**
   * Create permissions from individual boolean values
   */
  static fromBooleans(canView: boolean, canUpdate: boolean, canDelete: boolean): WorkflowPermission {
    return new WorkflowPermission(canView, canUpdate, canDelete);
  }

  /**
   * Check if this permission allows any access
   */
  hasAnyAccess(): boolean {
    return this._canView || this._canUpdate || this._canDelete;
  }

  /**
   * Check if this permission allows write access
   */
  hasWriteAccess(): boolean {
    return this._canUpdate || this._canDelete;
  }

  /**
   * Combine this permission with another (taking the most permissive)
   */
  combineWith(other: WorkflowPermission): WorkflowPermission {
    return new WorkflowPermission(
      this._canView || other._canView,
      this._canUpdate || other._canUpdate,
      this._canDelete || other._canDelete
    );
  }

  /**
   * Convert to plain object for backward compatibility
   */
  toPlainObject(): {
    canView: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    readOnly: boolean;
  } {
    return {
      canView: this._canView,
      canUpdate: this._canUpdate,
      canDelete: this._canDelete,
      readOnly: this.readOnly,
    };
  }

  /**
   * Check equality with another WorkflowPermission
   */
  equals(other: WorkflowPermission): boolean {
    return (
      this._canView === other._canView &&
      this._canUpdate === other._canUpdate &&
      this._canDelete === other._canDelete
    );
  }

  toString(): string {
    const permissions = [];
    if (this._canView) permissions.push("view");
    if (this._canUpdate) permissions.push("update");
    if (this._canDelete) permissions.push("delete");
    return permissions.length > 0 ? permissions.join(", ") : "no access";
  }
}
