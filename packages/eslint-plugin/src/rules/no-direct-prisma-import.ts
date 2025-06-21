import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === "@prisma/client") {
          return context.report({
            node,
            messageId: "no-direct-prisma-import",
            data: {},
            fix(fixer) {
              return fixer.replaceText(
                node.source,
                node.source.raw
                  .replace('"@prisma/client"', '"@calcom/prisma/client"')
                  .replace("'@prisma/client'", "'@calcom/prisma/client'")
              );
            },
          });
        }
      },
    };
  },
  name: "no-direct-prisma-import",
  meta: {
    fixable: "code",
    docs: {
      description: "Prevent direct imports from @prisma/client",
      recommended: "error",
    },
    messages: {
      "no-direct-prisma-import": `Direct imports from '@prisma/client' are not allowed. Use '@calcom/prisma/client' instead.`,
    },
    type: "problem",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
