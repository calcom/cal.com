import type { ReverseRelation, TableRegistry } from "./types";
import { AdminTable } from "./AdminTable";

/**
 * Central registry of all admin-browsable tables.
 * Provides O(1) lookups by slug/model and lazy-computed reverse relations.
 */
export class AdminTableRegistry {
  private tables: AdminTable[];
  private bySlug: Map<string, AdminTable>;
  private byModel: Map<string, AdminTable>;
  private reverseCache: Map<string, ReverseRelation[]> | null = null;

  constructor(definitions: TableRegistry) {
    this.tables = definitions.map((def) => new AdminTable(def));
    this.bySlug = new Map(this.tables.map((t) => [t.slug, t]));
    this.byModel = new Map(this.tables.map((t) => [t.modelName, t]));
  }

  getAll(): AdminTable[] {
    return this.tables;
  }

  getBySlug(slug: string): AdminTable | undefined {
    return this.bySlug.get(slug);
  }

  getByModel(modelName: string): AdminTable | undefined {
    return this.byModel.get(modelName);
  }

  get count(): number {
    return this.tables.length;
  }

  getReverseRelations(slug: string): ReverseRelation[] {
    if (!this.reverseCache) {
      this.reverseCache = this.buildReverseRelationMap();
    }
    return this.reverseCache.get(slug) ?? [];
  }

  private buildReverseRelationMap(): Map<string, ReverseRelation[]> {
    const map = new Map<string, ReverseRelation[]>();

    for (const table of this.tables) {
      for (const field of table.fields) {
        if (!field.relation?.linkTo) continue;
        if (field.relation.many) continue;

        const targetSlug = field.relation.linkTo.slug;
        const fkColumn = field.relation.fkColumn ?? `${field.column}Id`;

        if (!map.has(targetSlug)) map.set(targetSlug, []);
        map.get(targetSlug)!.push({
          sourceTable: table.def,
          sourceField: { ...field, column: fkColumn },
          sourceRelationField: field,
          label: `${table.displayNamePlural} (as ${field.label})`,
        });
      }
    }

    return map;
  }
}
