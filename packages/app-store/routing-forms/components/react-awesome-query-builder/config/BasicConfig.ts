// This is taken from "react-awesome-query-builder/lib/config/basic";
import { CoreConfig } from "@react-awesome-query-builder/core";
import type {
  Conjunction as RAQBConjunction,
  Widget as RAQBWidget,
  Type as RAQBType,
  Settings as RAQBSettings,
  Operator as RAQBOperator,
  ConfigContext,
  JsonLogicValue,
} from "@react-awesome-query-builder/ui";

export type Conjunction = RAQBConjunction;
export type Conjunctions = Record<string, Conjunction>;
export type Operator = RAQBOperator & {
  _jsonLogicIsExclamationOp?: boolean;
};
export type Operators = Record<string, Operator>;
export type WidgetWithoutFactory = Omit<RAQBWidget, "factory"> & {
  type: string;
  jsType: string;
  toJS: (val: JsonLogicValue) => JsonLogicValue;
};
export type WidgetsWithoutFactory = Record<string, WidgetWithoutFactory>;
export type Type = RAQBType;
export type Types = Record<string, Type>;
export type Settings = RAQBSettings;
const conjunctions: Conjunctions = {
  AND: {
    label: "And",
    jsonLogicConj: "and",
    reversedConj: "OR",
    formatConj: () => "",
    sqlFormatConj: () => "",
    spelFormatConj: () => "",
    mongoConj: "",
  },
  OR: {
    label: "Or",
    jsonLogicConj: "or",
    reversedConj: "AND",
    formatConj: () => "",
    sqlFormatConj: () => "",
    spelFormatConj: () => "",
    mongoConj: "",
  },
};

const operators: Operators = {
  equal: {
    label: "Equals",
    labelForFormat: "==",
    reversedOp: "not_equal",
    jsonLogic: "==",
  },
  not_equal: {
    isNotOp: true,
    label: "Does not equal",
    labelForFormat: "!=",
    reversedOp: "equal",
    jsonLogic: "!=",
  },
  less: {
    label: "Less than",
    labelForFormat: "<",
    reversedOp: "greater_or_equal",
    jsonLogic: "<",
  },
  less_or_equal: {
    label: "Less than or equal to",
    labelForFormat: "<=",
    reversedOp: "greater",
    jsonLogic: "<=",
  },
  greater: {
    label: "Greater than",
    labelForFormat: ">",
    reversedOp: "less_or_equal",
    jsonLogic: ">",
  },
  greater_or_equal: {
    label: "Greater than or equal to",
    labelForFormat: ">=",
    reversedOp: "less",
    jsonLogic: ">=",
  },
  like: {
    label: "Contains",
    labelForFormat: "Contains",
    reversedOp: "not_like",
    jsonLogic: (field: JsonLogicValue, op: JsonLogicValue, val: JsonLogicValue) => {
      return {
        in: [val, field],
      };
    },
    valueSources: ["value"],
  },
  not_like: {
    isNotOp: true,
    label: "Not contains",
    reversedOp: "like",
    labelForFormat: "Not Contains",
    jsonLogic: (field: JsonLogicValue, op: JsonLogicValue, val: JsonLogicValue) => {
      return {
        "!": {
          in: [val, field],
        },
      };
    },
    _jsonLogicIsExclamationOp: true,
    valueSources: ["value"],
  },
  starts_with: {
    label: "Starts with",
    labelForFormat: "Starts with",
    jsonLogic: "starts_with",
    valueSources: ["value"],
  },
  //   ends_with: {
  //     label: "Ends with",
  //     labelForFormat: "Ends with",
  //     jsonLogic: undefined, // not supported
  //     valueSources: ["value"],
  //   },
  between: {
    label: "Between",
    labelForFormat: "BETWEEN",
    cardinality: 2,
    valueLabels: ["Value from", "Value to"],
    reversedOp: "not_between",
    jsonLogic: (field: JsonLogicValue, op: JsonLogicValue, vals: [JsonLogicValue, JsonLogicValue]) => {
      const min = parseInt(vals[0], 10);
      const max = parseInt(vals[1], 10);
      return {
        and: [{ ">=": [field, min] }, { "<=": [field, max] }],
      };
    },
  },
  not_between: {
    isNotOp: true,
    label: "Not between",
    labelForFormat: "NOT BETWEEN",
    cardinality: 2,
    valueLabels: ["Value from", "Value to"],
    reversedOp: "between",
    jsonLogic: (field: JsonLogicValue, op: JsonLogicValue, vals: [JsonLogicValue, JsonLogicValue]) => {
      const min = parseInt(vals[0], 10);
      const max = parseInt(vals[1], 10);
      return {
        or: [{ "<": [field, min] }, { ">": [field, max] }],
      };
    },
  },
  is_empty: {
    label: "Is empty",
    labelForFormat: "IS EMPTY",
    cardinality: 0,
    reversedOp: "is_not_empty",
    jsonLogic: "!",
  },
  is_not_empty: {
    isNotOp: true,
    label: "Is not empty",
    labelForFormat: "IS NOT EMPTY",
    cardinality: 0,
    reversedOp: "is_empty",
    jsonLogic: "!!",
  },
  /**
   * We don't need these operators
   */
  //   is_null: {
  //     label: "Is null",
  //     labelForFormat: "IS NULL",
  //     cardinality: 0,
  //     reversedOp: "is_not_null",
  //     jsonLogic: "==",
  //   },
  //   is_not_null: {
  //     label: "Is not null",
  //     labelForFormat: "IS NOT NULL",
  //     cardinality: 0,
  //     reversedOp: "is_null",
  //     jsonLogic: "!=",
  //   },
  select_equals: {
    label: "Equals",
    labelForFormat: "==",
    reversedOp: "select_not_equals",
    jsonLogic: "==",
  },
  select_not_equals: {
    isNotOp: true,
    label: "Does not equal",
    labelForFormat: "!=",
    reversedOp: "select_equals",
    jsonLogic: "!=",
  },
  select_any_in: {
    label: "Any in",
    labelForFormat: "IN",
    reversedOp: "select_not_any_in",
    jsonLogic: "in",
  },
  select_not_any_in: {
    isNotOp: true,
    label: "Not any in",
    labelForFormat: "NOT IN",
    reversedOp: "select_any_in",
  },
  // We define this operator but use it conditionally for multiselect for Attributes only
  multiselect_some_in: {
    label: "Any in",
    cardinality: 1, // Expects 1 value (which is an array of selected items)
    jsonLogic: (field: JsonLogicValue, operator: JsonLogicValue, vals: JsonLogicValue) => {
      // RAQB v6 with cardinality: 1 wraps multiselect values in an extra array layer (important-comment)
      // Unwrap [[...]] to [...] for jsonLogic compatibility (important-comment)
      const unwrappedVals =
        Array.isArray(vals) && vals.length === 1 && Array.isArray(vals[0]) ? vals[0] : vals;
      return {
        // Tested in jsonLogic.test.ts
        some: [field, { in: [{ var: "" }, unwrappedVals] }],
      };
    },
  },
  multiselect_not_some_in: {
    label: "Not any in",
    reversedOp: "multiselect_some_in",
  },
  multiselect_equals: {
    label: "All in",
    reversedOp: "multiselect_not_equals",
    cardinality: 1, // Expects 1 value (which is an array of selected items)
    // jsonLogic2: "all-in",
    jsonLogic: (
      field: JsonLogicValue,
      op: JsonLogicValue,
      vals: JsonLogicValue,
      ..._rest: JsonLogicValue[]
    ) => {
      // RAQB v6 with cardinality: 1 wraps multiselect values in an extra array layer
      // Unwrap [[...]] to [...] for jsonLogic compatibility
      const unwrappedVals =
        Array.isArray(vals) && vals.length === 1 && Array.isArray(vals[0]) ? vals[0] : vals;
      return {
        // This is wrongly implemented as "includes". This isn't "equals". Because if field is ["a" ] and vals is ["a", "b"], it still matches. Expectation would probably be that it should be a strict match(["a", "b"] or ["b", "a"])
        all: [field, { in: [{ var: "" }, unwrappedVals] }],
      };
    },
  },
  multiselect_not_equals: {
    isNotOp: true,
    label: "Not all in",
    reversedOp: "multiselect_equals",
  },
  some: {
    label: "Some",
    labelForFormat: "SOME",
    cardinality: 0,
    jsonLogic: "some",
  },
  all: {
    label: "All",
    labelForFormat: "ALL",
    cardinality: 0,
  },
  none: {
    label: "None",
    labelForFormat: "NONE",
    cardinality: 0,
    jsonLogic: "none",
  },
};

const widgets: WidgetsWithoutFactory = {
  text: {
    type: "text",
    jsType: "string",
    valueSrc: "value" as const,
    valueLabel: "String",
    valuePlaceholder: "Enter string",
    toJS: (val: JsonLogicValue) => val,
  },
  textarea: {
    type: "text",
    jsType: "string",
    valueSrc: "value" as const,
    valueLabel: "Text",
    valuePlaceholder: "Enter text",
    toJS: (val: JsonLogicValue) => val,
  },
  number: {
    type: "number",
    jsType: "number",
    valueSrc: "value" as const,
    valueLabel: "Number",
    valuePlaceholder: "Enter number",
    toJS: (val: JsonLogicValue) => val,
  },
  select: {
    type: "select",
    jsType: "string",
    valueSrc: "value" as const,
    valueLabel: "Value",
    valuePlaceholder: "Select value",
    toJS: (val: JsonLogicValue) => val,
  },
  multiselect: {
    type: "multiselect",
    jsType: "array",
    valueSrc: "value" as const,
    valueLabel: "Values",
    valuePlaceholder: "Select values",
    toJS: (val: JsonLogicValue) => val,
  },
};

const types: Types = {
  text: {
    defaultOperator: "equal",
    mainWidget: "text",
    widgets: {
      text: {
        // Note: any operator mentioned here but isn't defined in operators will be automatically excluded
        operators: [
          "equal",
          "not_equal",
          "like",
          "not_like",
          "starts_with",
          "ends_with",
          "proximity",
          "is_empty",
          "is_not_empty",
          "is_null",
          "is_not_null",
        ],
        widgetProps: {},
        opProps: {},
      },
      textarea: {
        operators: [
          "equal",
          "not_equal",
          "like",
          "not_like",
          "starts_with",
          "ends_with",
          "is_empty",
          "is_not_empty",
          "is_null",
          "is_not_null",
        ],
        widgetProps: {},
        opProps: {},
      },
    },
  },
  number: {
    defaultOperator: "equal",
    mainWidget: "number",
    widgets: {
      number: {
        operators: [
          "equal",
          "not_equal",
          "less",
          "less_or_equal",
          "greater",
          "greater_or_equal",
          "between",
          "not_between",
          // "is_empty",
          // "is_not_empty",
          "is_null",
          "is_not_null",
        ],
      },
      //   slider: {
      //     operators: [
      //       "equal",
      //       "not_equal",
      //       "less",
      //       "less_or_equal",
      //       "greater",
      //       "greater_or_equal",
      //       // "is_empty",
      //       // "is_not_empty",
      //       "is_null",
      //       "is_not_null",
      //     ],
      //   },
    },
  },
  select: {
    mainWidget: "select",
    defaultOperator: "select_equals",
    widgets: {
      select: {
        operators: ["select_equals", "select_not_equals"],
        widgetProps: {
          customProps: {
            showSearch: true,
          },
        },
      },
      multiselect: {
        operators: ["select_any_in", "select_not_any_in"],
      },
    },
  },
  multiselect: {
    defaultOperator: "multiselect_equals",
    widgets: {
      multiselect: {
        operators: ["multiselect_equals", "multiselect_not_equals", "is_null", "is_not_null"],
      },
    },
  },
  //   "!group": {
  //     defaultOperator: "some",
  //     mainWidget: "number",
  //     widgets: {
  //       number: {
  //         widgetProps: {
  //           min: 0,
  //         },
  //         operators: [
  //           // w/o operand
  //           "some",
  //           "all",
  //           "none",

  //           // w/ operand - count
  //           "equal",
  //           "not_equal",
  //           "less",
  //           "less_or_equal",
  //           "greater",
  //           "greater_or_equal",
  //           "between",
  //           "not_between",
  //         ],
  //         opProps: {
  //           equal: {
  //             label: "Count ==",
  //           },
  //           not_equal: {
  //             label: "Count !=",
  //           },
  //           less: {
  //             label: "Count <",
  //           },
  //           less_or_equal: {
  //             label: "Count <=",
  //           },
  //           greater: {
  //             label: "Count >",
  //           },
  //           greater_or_equal: {
  //             label: "Count >=",
  //           },
  //           between: {
  //             label: "Count between",
  //           },
  //           not_between: {
  //             label: "Count not between",
  //           },
  //         },
  //       },
  //     },
  //   },
  //   case_value: {
  //     mainWidget: "case_value",
  //     widgets: {
  //       case_value: {},
  //     },
  //   },
};

const settings = {
  setOpOnChangeField: ["keep" as const, "default" as const], // 'default' (default if present), 'keep' (keep prev from last field), 'first', 'none'
  jsonLogic: {
    groupVarKey: "var",
    altVarKey: "var",
    lockedOp: "locked",
  },
};

const ctx: ConfigContext = {
  ...CoreConfig.ctx,
  W: {},
  O: {},
};

const basicConfig = {
  conjunctions,
  operators,
  widgets,
  types,
  settings,
  ctx,
};

export default basicConfig;
