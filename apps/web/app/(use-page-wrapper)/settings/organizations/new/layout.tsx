import { notFound } from "next/navigation";

import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const featuresRepository = getFeatureRepository();
  const organizations = await featuresRepository.checkIfFeatureIsEnabledGlobally("organizations");

  if (!organizations) {
    return notFound();
  }

  return children;
}
