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
  ">": {
    operator: "gt",
    secondaryOperand: null,
  },
  ">=": {
    operator: "gte",
    secondaryOperand: null,
  },
  "<": {
    operator: "lt",
    secondaryOperand: null,
  },
  "<=": {
    operator: "lte",
    secondaryOperand: null,
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

const NumberOperators = [">", ">=", "<", "<="];
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

  const isNumberOperator = NumberOperators.includes(operatorName);
  const secondaryOperandAsNumber = typeof secondaryOperand === "string" ? Number(secondaryOperand) : null;

  let prismaWhere;
  if (secondaryOperandAsNumber) {
    // We know that it's number operator so Prisma should query number
    // Note that if we get string values in DB(e.g. '100'), those values can't be filtered with number operators.
    if (isNumberOperator) {
      prismaWhere = {
        response: {
          path: [mainOperand, "value"],
          [`${prismaOperator}`]: secondaryOperandAsNumber,
        },
      };
    } else {
      // We know that it's not number operator but the input field might have been a number and thus stored value in DB as number.
      // Also, even for input type=number we might accidentally get string value(e.g. '100'). So, let reporting do it's best job with both number and string.
      prismaWhere = {
        OR: [
          {
            response: {
              path: [mainOperand, "value"],
              // Query as string e.g. equals '100'
              [`${prismaOperator}`]: secondaryOperand,
            },
          },
          {
            response: {
              path: [mainOperand, "value"],
              // Query as number e.g. equals 100
              [`${prismaOperator}`]: secondaryOperandAsNumber,
            },
          },
        ],
      };
    }
  } else {
    prismaWhere = {
      response: {
        path: [mainOperand, "value"],
        [`${prismaOperator}`]: secondaryOperand,
      },
    };
  }

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
