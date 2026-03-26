export const SHARED_TOKENS = {
  // Infrastructure services
  TASKER: Symbol("ITasker"),
  LOGGER: Symbol("ILogger"),
  LOGGER_MODULE: Symbol("ILoggerModule"),
  TRIGGER_DEV_LOGGER: Symbol("ITriggerDevLogger"),
  TRIGGER_DEV_LOGGER_MODULE: Symbol("ITriggerDevLoggerModule"),
} as const;
