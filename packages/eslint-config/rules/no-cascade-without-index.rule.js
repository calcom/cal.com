import PrismaAst from "@mrleebo/prisma-ast";
import fs from "fs";
import path from "path";

const getSchema = PrismaAst.getSchema || PrismaAst.default?.getSchema || null;
const astCache = new Map();

function extractFieldName(node) {
  if (!node) return null;
  if (typeof node === "string") return node;
  if (node.value) return node.value;
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLineIndex(content) {
  return content.split("\n");
}

function findFieldLocByText(lines, fieldName) {
  const re = new RegExp(`\\b${escapeRegex(fieldName)}\\b`);
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].search(re);
    if (idx !== -1) {
      return {
        start: { line: i + 1, column: idx },
        end: { line: i + 1, column: idx + fieldName.length },
      };
    }
  }
  return { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } };
}

function collectIndexedFields(modelNode) {
  const indexed = new Set();

  for (const prop of modelNode.properties || []) {
    if (prop.type === "attribute" && prop.kind === "object") {
      if (["id", "unique", "index"].includes(prop.name)) {
        for (const arg of prop.args || []) {
          const arr = arg.value?.type === "array" ? arg.value.args : [];
          for (const field of arr) {
            const name = extractFieldName(field);
            if (name) indexed.add(name);
          }
        }
      }
    }
    if (prop.type === "field") {
      const attrs = prop.attributes || [];
      if (attrs.some((a) => a.name === "id" || a.name === "unique")) {
        indexed.add(prop.name);
      }
    }
  }

  return indexed;
}

function validateCascade(modelNode, indexed, context, lines) {
  for (const field of modelNode.properties || []) {
    if (field.type !== "field") continue;

    const relation = field.attributes?.find((a) => a.name === "relation");
    if (!relation) continue;

    let onDeleteCascade = false;
    let fkFields = [];

    for (const arg of relation.args || []) {
      const kv = arg.value;
      if (!kv) continue;
      if (kv.type === "keyValue" && kv.key === "onDelete" && kv.value === "Cascade") {
        onDeleteCascade = true;
      }
      if (kv.type === "keyValue" && kv.key === "fields" && kv.value?.type === "array") {
        fkFields = kv.value.args.map(extractFieldName).filter(Boolean);
      }
    }

    if (!onDeleteCascade || fkFields.length === 0) continue;

    for (const fk of fkFields) {
      if (indexed.has(fk)) continue;

      const fkNode = modelNode.properties?.find((p) => p.type === "field" && p.name === fk) || null;

      const loc = fkNode?.loc?.start
        ? fkNode.loc.end
          ? fkNode.loc
          : {
              start: fkNode.loc.start,
              end: {
                line: fkNode.loc.start.line,
                column: fkNode.loc.start.column + (fk.length || 1),
              },
            }
        : field?.loc?.start
        ? {
            start: field.loc.start,
            end: { line: field.loc.start.line, column: field.loc.start.column + (fk.length || 1) },
          }
        : findFieldLocByText(lines, fk);

      context.report({
        messageId: "missingIndex",
        data: { model: modelNode.name, field: fk },
        loc,
      });
    }
  }
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Foreign key fields with onDelete: Cascade must have an index (@id, @unique, @@index, or @@unique).",
    },
    messages: {
      missingIndex:
        "FK '{{model}}.{{field}}' uses `onDelete: Cascade` but has no index (@id, @unique, @@index, @@unique).",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();
    if (!filename.endsWith(".prisma")) return {};

    return {
      Program() {
        const abs = path.resolve(filename);
        if (typeof getSchema !== "function") return;

        let schemaContent = "";
        let cached = astCache.get(abs);

        if (!cached) {
          try {
            schemaContent = fs.readFileSync(abs, "utf8");
            const ast = getSchema(schemaContent);
            if (!ast?.list) return;
            cached = { ast, content: schemaContent };
            astCache.set(abs, cached);
          } catch {
            return;
          }
        } else {
          schemaContent = cached.content;
        }

        const { ast } = cached;
        const models = ast.list.filter((n) => n.type === "model");
        const lines = buildLineIndex(schemaContent);

        for (const model of models) {
          const indexed = collectIndexedFields(model);
          validateCascade(model, indexed, context, lines);
        }
      },
    };
  },
};
