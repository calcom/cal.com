export type AppExperiments = Record<string, never>;

export type ExperimentVariants<T extends keyof AppExperiments> = AppExperiments[T];
