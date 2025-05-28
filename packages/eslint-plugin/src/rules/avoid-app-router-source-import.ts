import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === "@calcom/trpc/server/routers/_app") {
          node.specifiers.forEach((item) => {
            if (
              item.type === "ImportSpecifier" &&
              "imported" in item &&
              item.imported?.name === "AppRouter"
            ) {
              return context.report({
                node: item,
                loc: node.loc,
                messageId: "avoid-app-router-source-import",
                fix: (fixer) => fixer.replaceText(node.source, '"@calcom/trpc/types/server/routers/_app"'),
              });
            }
          });
        }
      },
    };
  },
  name: "avoid-app-router-source-import",
  meta: {
    fixable: "code",
    docs: {
      description: "Avoid importing AppRouter from source file, use generated types instead",
      recommended: "error",
    },
    messages: {
      "avoid-app-router-source-import": `Import AppRouter from '@calcom/trpc/types/server/routers/_app' instead of the source file for better performance.`,
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
