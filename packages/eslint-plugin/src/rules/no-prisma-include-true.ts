import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import type { ReportDescriptor } from "@typescript-eslint/utils/dist/ts-eslint";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const assesIncludePropertyIncludesTrue = (
  includeProperty: TSESTree.Property,
  reporter: { (reportObj: ReportDescriptor<"no-prisma-include-true">): void }
) => {
  if (includeProperty.value.type === "ObjectExpression") {
    includeProperty.value.properties.forEach((childProperty) => {
      if (
        childProperty.type === "Property" &&
        childProperty.value.type === "Literal" &&
        childProperty.value.value === true
      ) {
        reporter({
          node: childProperty,
          messageId: "no-prisma-include-true",
        });
      }
    });
  }
};

const searchIncludeProperty = (
  property: TSESTree.Property,
  reporter: { (reportObj: ReportDescriptor<"no-prisma-include-true">): void }
) => {
  if (property.type === "Property") {
    // If property is include, check if it has a child property with value true
    if (property.key.type === "Identifier" && property.key.name === "include") {
      assesIncludePropertyIncludesTrue(property, reporter);
    }

    // If property value is also an object, recursively search for include property
    if (property.value.type === "ObjectExpression") {
      property.value.properties.forEach((childProperty) => {
        if (childProperty.type === "Property") {
          searchIncludeProperty(childProperty, reporter);
        }
      });
    }
  }
};

const rule = createRule({
  create: function (context) {
    return {
      CallExpression(node) {
        if (!(node.callee as TSESTree.MemberExpression).property) {
          return null;
        }

        const nodeName = ((node.callee as TSESTree.MemberExpression).property as TSESTree.Identifier).name;

        if (
          !["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany"].includes(nodeName)
        ) {
          return null;
        }

        const nodeArgs = node.arguments[0] as TSESTree.ObjectExpression;
        if (!nodeArgs) {
          return null;
        }

        const backReporter = (reportObj: ReportDescriptor<"no-prisma-include-true">) => {
          context.report(reportObj);
        };

        nodeArgs.properties?.forEach((property) => {
          if (property.type === "Property") {
            searchIncludeProperty(property, backReporter);
          }
        });
        return null;
      },
    };
  },

  name: "no-prisma-include-true",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow passing argument object with include: { AnyPropertyName: true } to prisma methods",
      recommended: "error",
    },
    messages: {
      "no-prisma-include-true": `Do not pass argument object with include: { AnyPropertyName: true } to prisma methods`,
    },
    fixable: "code",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
