import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    return {
      ImportDeclaration(node) {
        node.source.value === "@prisma/client" &&
          node.importKind !== "type" &&
          node.specifiers.forEach((item) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const enumType = item.imported?.name; // ts doesn't know about imported, bad type?
            if (!enumType || enumType === "Prisma" || enumType === "PrismaClient") return null;

            return context.report({
              node: item,
              loc: node.loc,
              messageId: "avoid-prisma-client-import",
              data: {
                enumType,
              },
            });
          });
      },
    };
  },
  name: "avoid-prisma-client-import-for-enums",
  meta: {
    fixable: "code",
    docs: {
      description: "Avoid prisma client import for enums",
      recommended: "error",
    },
    messages: {
      "avoid-prisma-client-import": `Import { {{enumType}} } from '@calcom/prisma/enums' to avoid including @prisma/client.`,
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
