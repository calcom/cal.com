import { getOOORepository } from "@calcom/features/di/containers/ooo-repository";

export const outOfOfficeReasonList = async () => {
  const oooRepository = getOOORepository();
  const outOfOfficeReasons = await oooRepository.findEnabledReasons();
  return outOfOfficeReasons;
};
