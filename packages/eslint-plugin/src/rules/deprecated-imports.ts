import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    return {
      ImportDeclaration(node) {
        node.specifiers.length &&
          node.source.value === "dayjs" &&
          node.specifiers.forEach((item) => {
            if (item.local.name === "dayjs") {
              return context.report({
                node: item,
                loc: node.loc,
                messageId: "dayjs-moved",
                fix: (fixer) => fixer.replaceText(node, "import dayjs from '@calcom/dayjs'"),
              });
            }
            return null;
          });
      },
    };
  },
  name: "deprecated-imports",
  meta: {
    fixable: "code",
    docs: {
      description: "Avoid deprecated imports",
      recommended: "warn",
    },
    messages: {
      "dayjs-moved": `Import dayjs from '@calcom/daysjs' to avoid plugin conflicts.`,
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
