const OPERATOR_MAP = {
  "==": {
    operator: "equals",
  },
  in: {
    operator: "string_contains",
  },
  "!=": {
    operator: "NOT.equals",
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
  },
};

const LOGICAL_OPERATOR_MAP = {
  and: "AND",
  or: "OR",
  "!": "NOT",
};

const processOperator = (operatorName, logicData, isNegation) => {
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

const isNegation = (logicData) => {
  const negationData = logicData["!"];
  for (const [operatorName] of Object.entries(OPERATOR_MAP)) {
    if (negationData && negationData[operatorName]) {
      return true;
    }
  }
};

const processOperators = (logicData) => {
  const _isNegation = isNegation(logicData);
  if (_isNegation) {
    logicData = logicData["!"];
  }
  for (const [operatorName] of Object.entries(OPERATOR_MAP)) {
    if (logicData[operatorName]) {
      return processOperator(operatorName, logicData, _isNegation);
    }
  }
};

export const jsonLogicToPrisma = (jsonLogic) => {
  try {
    if (!jsonLogic) {
      return {};
    }
    jsonLogic = jsonLogic.logic;
    if (!jsonLogic) {
      return {};
    }

    let prismaWhere = {};
    let negateLogic = false;
    if (jsonLogic["!"]) {
      jsonLogic = jsonLogic["!"];
      negateLogic = true;
    }
    if (jsonLogic.and) {
      const where = (prismaWhere[LOGICAL_OPERATOR_MAP["and"]] = []);
      jsonLogic.and.forEach((and) => {
        where.push(processOperators(and));
      });
    } else if (jsonLogic.or) {
      const where = (prismaWhere[LOGICAL_OPERATOR_MAP["or"]] = []);

      jsonLogic.or.forEach((or) => {
        where.push(processOperators(or));
      });
    }

    if (negateLogic) {
      prismaWhere = { NOT: { ...prismaWhere } };
    }

    return prismaWhere;
  } catch (e) {
    console.log("Error converting to prisma `where`", JSON.stringify(jsonLogic), "Error is ", e);
  }
};
