export class SdkInitializationError extends Error {
  constructor(message: string) {
    super(`Failed to initialize SDK: ${message}`);
    this.name = "SdkInitializationError";
  }
}
