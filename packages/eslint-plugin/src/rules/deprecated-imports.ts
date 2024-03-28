import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    return {
      ImportDeclaration(node) {
        if (!node.specifiers.length) return null;
        if (!["dayjs", "lucide-react"].includes(node.source.value)) return null;
        node.specifiers.forEach((item) => {
          console.log("item.local.name", item.local.name);
          if (item.local.name === "lucide-react") {
            return context.report({
              node: item,
              loc: node.loc,
              messageId: "lucide-moved",
            });
          }
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
      "lucide-moved": `Import icons from '@calcom/ui/components/icon' to avoid bundle size and memory issues.`,
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
