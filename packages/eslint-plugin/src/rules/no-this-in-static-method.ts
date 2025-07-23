import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    let currentMethodIsStatic = false;
    let currentClassName = "";

    return {
      MethodDefinition(node) {
        if (node.static && node.key.type === "Identifier") {
          currentMethodIsStatic = true;
          if (node.parent?.type === "ClassBody" && node.parent.parent?.type === "ClassDeclaration") {
            const classNode = node.parent.parent as TSESTree.ClassDeclaration;
            if (classNode.id?.name) {
              currentClassName = classNode.id.name;
            }
          }
        }
      },
      "MethodDefinition:exit"(node: TSESTree.MethodDefinition) {
        if (node.static) {
          currentMethodIsStatic = false;
          currentClassName = "";
        }
      },
      MemberExpression(node) {
        if (
          currentMethodIsStatic &&
          node.object.type === "ThisExpression" &&
          node.property.type === "Identifier"
        ) {
          const parent = node.parent;

          const isPassedToCallback =
            parent?.type === "CallExpression" &&
            parent.arguments.includes(node) &&
            parent.callee.type === "MemberExpression" &&
            parent.callee.property.type === "Identifier" &&
            ["map", "filter", "forEach", "reduce", "find", "some", "every"].includes(
              parent.callee.property.name
            );

          const isVariableAssignment = parent?.type === "VariableDeclarator" && parent.init === node;

          const isObjectProperty = parent?.type === "Property" && parent.value === node;

          const isArrayElement = parent?.type === "ArrayExpression" && parent.elements.includes(node);

          const isFunctionArgument =
            parent?.type === "CallExpression" &&
            parent.arguments.includes(node) &&
            !(
              parent.callee.type === "MemberExpression" &&
              parent.callee.property.type === "Identifier" &&
              ["map", "filter", "forEach", "reduce", "find", "some", "every"].includes(
                parent.callee.property.name
              )
            );

          const isReturnStatement = parent?.type === "ReturnStatement" && parent.argument === node;

          if (
            isPassedToCallback ||
            isVariableAssignment ||
            isObjectProperty ||
            isArrayElement ||
            isFunctionArgument ||
            isReturnStatement
          ) {
            context.report({
              node,
              messageId: "no-this-in-static-method",
              data: {
                className: currentClassName,
                methodName: node.property.name,
              },
              fix(fixer) {
                if (currentClassName && node.property.type === "Identifier") {
                  return fixer.replaceText(node, `${currentClassName}.${node.property.name}`);
                }
                return null;
              },
            });
          }
        }
      },
    };
  },
  name: "no-this-in-static-method",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow using 'this' to reference static methods within static methods",
      recommended: "error",
    },
    messages: {
      "no-this-in-static-method":
        "Do not use 'this.{{methodName}}' in static methods. Use '{{className}}.{{methodName}}' instead to avoid context loss when passed to callbacks.",
    },
    fixable: "code",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
