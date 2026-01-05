export type AppExperiments = {
  "test-experiment": "control" | "treatment";
};

export type ExperimentVariants<T extends keyof AppExperiments> = AppExperiments[T];
