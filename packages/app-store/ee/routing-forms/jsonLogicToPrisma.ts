export const jsonLogicToPrisma = (jsonLogic) => {
  if (!jsonLogic) {
    return {};
  }
  jsonLogic = jsonLogic.logic;
  if (!jsonLogic) {
    return {};
  }
  const andPart1 = jsonLogic.and[0];
  const andPart2 = jsonLogic.and[1];
  const prismaWhere = {
    AND: [],
  };
  if (andPart1["=="]) {
    const leftOperand = andPart1["=="][0].var;
    const rightOperand = andPart1["=="][1];
    prismaWhere.AND.push({ response: { path: [leftOperand, "value"], equals: rightOperand } });
  }
  if (andPart2["=="]) {
    const leftOperand = andPart2["=="][0].var;
    const rightOperand = andPart2["=="][1];
    prismaWhere.AND.push({ response: { path: [leftOperand, "value"], equals: rightOperand } });
  }
  return prismaWhere;
};
