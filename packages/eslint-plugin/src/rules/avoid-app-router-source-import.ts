import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === "@calcom/trpc/server/routers/_app") {
          const hasAppRouter = node.specifiers.some(
            (item) =>
              item.type === "ImportSpecifier" && "imported" in item && item.imported?.name === "AppRouter"
          );

          if (hasAppRouter) {
            const sourceCode = context.getSourceCode();
            const importText = sourceCode.getText(node);

            const fixedImport = importText.replace(
              "@calcom/trpc/server/routers/_app",
              "@calcom/trpc/types/server/routers/_app"
            );

            return context.report({
              node,
              messageId: "avoid-app-router-source-import",
              fix: (fixer) => fixer.replaceText(node, fixedImport),
            });
          }
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
