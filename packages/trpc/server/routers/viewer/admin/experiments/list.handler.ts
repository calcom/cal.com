import { getExperimentService } from "@calcom/features/experiments/di/ExperimentService.container";

export const listHandler = async () => {
  const service = getExperimentService();
  return service.getAdminListView();
};

export default listHandler;
