import { getAbuseRulesRepository } from "@calcom/features/abuse-rules/di/AbuseRulesRepository.container";

import type { TListAbuseRulesInputSchema } from "./list.schema";

type ListAbuseRulesOptions = {
  input: TListAbuseRulesInputSchema;
};

export const listAbuseRulesHandler = async ({ input }: ListAbuseRulesOptions) => {
  const repository = getAbuseRulesRepository();
  const { rows, totalRowCount } = await repository.findPaginated(input.limit, input.offset);
  return { rows, meta: { totalRowCount } };
};
