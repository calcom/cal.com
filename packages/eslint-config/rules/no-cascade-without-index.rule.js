import prismaInternals from "@prisma/internals";
import fs from "fs";

const { getDMMF } = prismaInternals;

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `onDelete: Cascade` without an index on the same field",
    },
    messages: {
      missingIndex: "Model '{{model}}.{{field}}' has onDelete: Cascade but no index defined.",
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (!filename.endsWith(".prisma")) return {};

    return {
      Program: async () => {
        const schema = fs.readFileSync(filename, "utf8");
        let dmmf;
        try {
          dmmf = await getDMMF({ datamodel: schema });
        } catch {
          return;
        }

        for (const model of dmmf.datamodel.models) {
          for (const field of model.fields) {
            if (field.relationOnDelete !== "Cascade") continue;

            const hasIndex = model.indexes?.some((i) => i.fields?.includes(field.name));
            if (!hasIndex) {
              context.report({
                messageId: "missingIndex",
                data: { model: model.name, field: field.name },
                loc: { line: 1, column: 0 },
              });
            }
          }
        }
      },
    };
  },
};
