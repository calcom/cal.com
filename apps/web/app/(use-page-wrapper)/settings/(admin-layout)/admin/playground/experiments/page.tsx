import { ExperimentPlayground } from "@calcom/features/experiments/playground/ExperimentPlayground";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Experiments Playground",
    () => "Test A/B experiment variants",
    undefined,
    undefined,
    "/settings/admin/playground/experiments"
  );

const Page = () => {
  return <ExperimentPlayground />;
};

export default Page;
