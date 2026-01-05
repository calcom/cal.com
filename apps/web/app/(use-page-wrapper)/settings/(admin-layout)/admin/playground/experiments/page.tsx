import { _generateMetadata } from "app/_utils";

import { ExperimentPlayground } from "@calcom/features/experiments/components/ExperimentPlayground";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "experiments playground",
    () => "test experiment variant assignments and track conversions",
    undefined,
    undefined,
    "/settings/admin/playground/experiments"
  );

const Page = () => {
  return <ExperimentPlayground />;
};

export default Page;
