export type JsonLogicQuery = {
  logic: {
    and?: LogicData[];
    or?: LogicData[];
    "!"?: {
      and?: LogicData[];
      or?: LogicData[];
    };
  } | null;
};

const OPERATOR_MAP = {
  "==": {
    operator: "equals",
    secondaryOperand: null,
  },
  in: {
    operator: "string_contains",
    secondaryOperand: null,
  },
  "!=": {
    operator: "NOT.equals",
    secondaryOperand: null,
  },
  "!": {
    operator: "equals",
    secondaryOperand: "",
  },
  "!!": {
    operator: "NOT.equals",
    secondaryOperand: "",
  },
  all: {
    operator: "array_contains",
    secondaryOperand: null,
  },
};

const LOGICAL_OPERATOR_MAP = {
  and: "AND",
  or: "OR",
  "!": "NOT",
};

type LogicData = Partial<Record<keyof typeof OPERATOR_MAP, any>>;
type NegatedLogicData = {
  "!": LogicData;
};

const processOperator = (
  operatorName: keyof typeof OPERATOR_MAP,
  logicData: LogicData,
  isNegation: boolean
) => {
  const mappedOperator = OPERATOR_MAP[operatorName].operator;
  const staticSecondaryOperand = OPERATOR_MAP[operatorName].secondaryOperand;
  isNegation = isNegation || mappedOperator.startsWith("NOT.");
  const prismaOperator = mappedOperator.replace("NOT.", "");
  const operands =
    logicData[operatorName] instanceof Array ? logicData[operatorName] : [logicData[operatorName]];

  const mainOperand = operatorName !== "in" ? operands[0].var : operands[1].var;
  let secondaryOperand = staticSecondaryOperand || (operatorName !== "in" ? operands[1] : operands[0]) || "";
  if (operatorName === "all") {
    secondaryOperand = secondaryOperand.in[1];
  }
  const prismaWhere = {
    response: { path: [mainOperand, "value"], [`${prismaOperator}`]: secondaryOperand },
  };

  if (isNegation) {
    return {
      NOT: {
        ...prismaWhere,
      },
    };
  }
  return prismaWhere;
};
const isNegation = (logicData: LogicData | NegatedLogicData) => {
  if ("!" in logicData) {
    const negatedLogicData = logicData["!"];

    for (const [operatorName] of Object.entries(OPERATOR_MAP)) {
      if (negatedLogicData[operatorName]) {
        return true;
      }
    }
  }
  return false;
};

const processOperators = (logicData: LogicData) => {
  const _isNegation = isNegation(logicData);
  if (_isNegation) {
    logicData = logicData["!"];
  }
  for (const [key] of Object.entries(OPERATOR_MAP)) {
    const operatorName = key as keyof typeof OPERATOR_MAP;
    if (logicData[operatorName]) {
      return processOperator(operatorName, logicData, _isNegation);
    }
  }
};

// There are many possible combinations of jsonLogic, so making it typesafe is an unnecessary effort. Unit tests should be enough.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jsonLogicToPrisma = (query: JsonLogicQuery) => {
  try {
    let logic = query.logic;
    if (!logic) {
      return {};
    }

    // Any of the possible prisma `where` clause values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prismaWhere: any = {};
    let negateLogic = false;

    // Case: Negation of "Any of these"
    // Example: {"logic":{"!":{"or":[{"==":[{"var":"505d3c3c-aa71-4220-93a9-6fd1e1087939"},"1"]},{"==":[{"var":"505d3c3c-aa71-4220-93a9-6fd1e1087939"},"1"]}]}}}
    if (logic["!"]) {
      logic = logic["!"];
      negateLogic = true;
    }

    // Case: All of these
    if (logic.and) {
      const where = (prismaWhere[LOGICAL_OPERATOR_MAP["and"]] = [] as Record<any, any>[]);
      logic.and.forEach((and) => {
        const res = processOperators(and);
        if (!res) {
          return;
        }
        where.push(res);
      });
    }
    // Case: Any of these
    else if (logic.or) {
      const where = (prismaWhere[LOGICAL_OPERATOR_MAP["or"]] = [] as Record<any, any>[]);

      logic.or.forEach((or) => {
        const res = processOperators(or);
        if (!res) {
          return;
        }
        where.push(res);
      });
    }

    if (negateLogic) {
      prismaWhere = { NOT: { ...prismaWhere } };
    }

    return prismaWhere;
  } catch (e) {
    console.log("Error converting to prisma `where`", JSON.stringify(query), "Error is ", e);
  }
};
