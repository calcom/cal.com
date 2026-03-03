import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { notFound } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const featureRepository = getFeatureRepository();
  const organizations = await featureRepository.checkIfFeatureIsEnabledGlobally("organizations");

  if (!organizations) {
    return notFound();
  }

  return children;
}
