// It can have many shapes, so just use any and we rely on unit tests to test all those scenarios.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogicData = Partial<Record<keyof typeof OPERATOR_MAP, any>>;
type NegatedLogicData = {
  "!": LogicData;
};

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

type PrismaWhere = {
  AND?: ReturnType<typeof convertQueriesToPrismaWhereClause>[];
  OR?: ReturnType<typeof convertQueriesToPrismaWhereClause>[];
  NOT?: PrismaWhere;
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

/**
 *  Operators supported on array of basic queries
 */
const GROUP_OPERATOR_MAP = {
  and: "AND",
  or: "OR",
  "!": "NOT",
} as const;

const convertSingleQueryToPrismaWhereClause = (
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

const convertQueriesToPrismaWhereClause = (logicData: LogicData) => {
  const _isNegation = isNegation(logicData);
  if (_isNegation) {
    logicData = logicData["!"];
  }
  for (const [key] of Object.entries(OPERATOR_MAP)) {
    const operatorName = key as keyof typeof OPERATOR_MAP;
    if (logicData[operatorName]) {
      return convertSingleQueryToPrismaWhereClause(operatorName, logicData, _isNegation);
    }
  }
};

export const jsonLogicToPrisma = (query: JsonLogicQuery) => {
  try {
    let logic = query.logic;
    if (!logic) {
      return {};
    }

    let prismaWhere: PrismaWhere = {};
    let negateLogic = false;

    // Case: Negation of "Any of these"
    // Example: {"logic":{"!":{"or":[{"==":[{"var":"505d3c3c-aa71-4220-93a9-6fd1e1087939"},"1"]},{"==":[{"var":"505d3c3c-aa71-4220-93a9-6fd1e1087939"},"1"]}]}}}
    if (logic["!"]) {
      logic = logic["!"];
      negateLogic = true;
    }

    // Case: All of these
    if (logic.and) {
      const where: PrismaWhere["AND"] = (prismaWhere[GROUP_OPERATOR_MAP["and"]] = []);
      logic.and.forEach((and) => {
        const res = convertQueriesToPrismaWhereClause(and);
        if (!res) {
          return;
        }
        where.push(res);
      });
    }
    // Case: Any of these
    else if (logic.or) {
      const where: PrismaWhere["OR"] = (prismaWhere[GROUP_OPERATOR_MAP["or"]] = []);

      logic.or.forEach((or) => {
        const res = convertQueriesToPrismaWhereClause(or);
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
    return {};
  }
};
