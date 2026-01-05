export * from "./config";
export { ExperimentsRepository } from "./experiments.repository";
export { trackExperimentConversion, trackExperimentExposure } from "./lib/posthog-tracker";
export * from "./types";
export {
  assignVariantDeterministic,
  assignVariantRandom,
  validateVariantPercentages,
} from "./utils/variant-assignment";
export { useExperiment } from "./hooks/useExperiment";
