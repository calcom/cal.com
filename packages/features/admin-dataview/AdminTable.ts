import type { FieldDefinition, TableDefinition } from "./types";

/**
 * Wraps a raw TableDefinition with computed accessors and query-building methods.
 * This is the main object the service and UI interact with.
 */
export class AdminTable {
  constructor(public readonly def: TableDefinition) {}

  get slug() { return this.def.slug; }
  get modelName() { return this.def.modelName; }
  get displayName() { return this.def.displayName; }
  get displayNamePlural() { return this.def.displayNamePlural; }
  get description() { return this.def.description; }
  get category() { return this.def.category; }
  get fields() { return this.def.fields; }
  get actions() { return this.def.actions; }
  get panels() { return this.def.panels; }
  get pageSize() { return this.def.pageSize ?? 50; }
  get defaultSort() { return this.def.defaultSort ?? this.primaryKeyColumn; }
  get defaultSortDirection() { return this.def.defaultSortDirection ?? "desc" as const; }

  get primaryKeyColumn(): string {
    return this.fields.find((f) => f.isPrimary)?.column ?? "id";
  }

  get primaryKeyField(): FieldDefinition | undefined {
    return this.fields.find((f) => f.isPrimary);
  }

  get searchableFields(): string[] {
    return this.fields.filter((f) => f.searchable).map((f) => f.column);
  }

  get listFields(): FieldDefinition[] {
    return this.fields.filter((f) => f.access !== "hidden" && f.showInList !== false);
  }

  get relationFields(): FieldDefinition[] {
    return this.fields.filter((f) => f.relation != null);
  }

  get editableFieldNames(): string[] {
    return this.fields.filter((f) => f.access === "editable").map((f) => f.column);
  }

  get visibleFields(): FieldDefinition[] {
    return this.fields.filter((f) => f.access !== "hidden");
  }

  get prismaAccessor(): string {
    return this.modelName.charAt(0).toLowerCase() + this.modelName.slice(1);
  }

  coercePrimaryKey(raw: string | number): string | number {
    const pk = this.primaryKeyField;
    if (pk?.type === "number") {
      return typeof raw === "number" ? raw : parseInt(raw, 10);
    }
    return String(raw);
  }

  isRelationColumn(column: string): boolean {
    return this.fields.some((f) => f.column === column && f.relation);
  }

  resolveSortField(requested?: string): string {
    const field = requested ?? this.defaultSort;
    return this.isRelationColumn(field) ? this.primaryKeyColumn : field;
  }

  buildPrismaSelect(): Record<string, unknown> {
    const select: Record<string, unknown> = {};
    const countRelations: string[] = [];

    for (const field of this.fields) {
      if (field.access === "hidden") continue;

      if (field.relation) {
        const rel = field.relation;
        if (rel.many && rel.displayField === "_count") {
          countRelations.push(field.column);
          if (rel.take && rel.take > 0) {
            select[field.column] = { select: rel.select, take: rel.take };
          }
        } else if (rel.many) {
          select[field.column] = { select: rel.select, take: rel.take ?? 5 };
        } else {
          select[field.column] = { select: rel.select };
        }
      } else {
        select[field.column] = true;
      }
    }

    if (countRelations.length > 0) {
      const countSelect: Record<string, true> = {};
      for (const rel of countRelations) countSelect[rel] = true;
      select._count = { select: countSelect };
    }

    return select;
  }

  buildWhere(search?: string, filters?: Record<string, unknown>): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];

    if (search?.trim()) {
      const searchable = this.searchableFields;
      if (searchable.length > 0) {
        const orConditions = searchable
          .map((fieldName) => {
            const fieldDef = this.fields.find((f) => f.column === fieldName);
            if (!fieldDef || fieldDef.access === "hidden") return null;
            if (fieldDef.type === "string" || fieldDef.type === "email" || fieldDef.type === "url") {
              return { [fieldName]: { contains: search.trim(), mode: "insensitive" } };
            }
            if (fieldDef.type === "number") {
              const num = parseInt(search.trim(), 10);
              if (!isNaN(num)) return { [fieldName]: num };
            }
            return null;
          })
          .filter(Boolean);

        if (orConditions.length > 0) {
          conditions.push({ OR: orConditions });
        }
      }
    }

    if (filters) {
      const allowedColumns = new Set(this.visibleFields.map((f) => f.column));
      const structuralKeys = new Set(["OR", "AND", "NOT"]);

      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === "") continue;
        if (allowedColumns.has(key) || structuralKeys.has(key)) {
          conditions.push({ [key]: value });
        }
      }
    }

    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { AND: conditions };
  }

  postProcessRow(row: Record<string, unknown>): Record<string, unknown> {
    const result = { ...row };
    const counts = (result._count ?? {}) as Record<string, number>;

    for (const field of this.fields) {
      if (!field.relation) continue;
      const rel = field.relation;

      if (rel.many && rel.displayField === "_count") {
        const count = counts[field.column] ?? 0;
        const fetchedItems = Array.isArray(result[field.column])
          ? (result[field.column] as Record<string, unknown>[])
          : [];
        result[field.column] = {
          _relation: true,
          _many: true,
          _count: count,
          _items: fetchedItems,
          _display: `${count} record${count !== 1 ? "s" : ""}`,
          _linkSlug: rel.linkTo?.slug,
        };
      } else if (result[field.column] != null && typeof result[field.column] === "object") {
        const rawData = result[field.column] as Record<string, unknown>;

        if (rel.many && Array.isArray(result[field.column])) {
          const items = result[field.column] as Record<string, unknown>[];
          result[field.column] = {
            _relation: true,
            _many: true,
            _count: items.length,
            _items: items,
            _display: `${items.length} record${items.length !== 1 ? "s" : ""}`,
            _linkSlug: rel.linkTo?.slug,
          };
        } else {
          const displayValue = rawData[rel.displayField] ?? null;
          const linkParam = rel.linkTo ? rawData[rel.linkTo.paramField] : null;
          result[field.column] = {
            _relation: true,
            _many: false,
            _data: rawData,
            _display: displayValue != null ? String(displayValue) : "—",
            _linkSlug: rel.linkTo?.slug,
            _linkParam: linkParam,
          };
        }
      }
    }

    delete result._count;
    return result;
  }
}
